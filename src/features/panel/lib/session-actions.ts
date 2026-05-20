"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthResult {
  error?: string;
  ok?: boolean;
  pendingConfirmation?: boolean;
  needsConfirmation?: boolean;
  email?: string;
}

const signUpSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres"),
  nombre: z.string().min(2, "Nombre requerido").max(120),
});

export async function signUpResponsableAction(
  formData: FormData
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    nombre: String(formData.get("nombre") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { nombre: parsed.data.nombre },
      // Después de que confirme el email, lo mandamos al callback que setea
      // la sesión en cookies del dominio y redirige a /panel para que cargue
      // su primer hospedaje.
      emailRedirectTo: `${siteUrl}/auth/callback?next=/panel`,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear el usuario." };

  // Anti-enumeration de Supabase: si el email ya existe y "Confirm email" está
  // activado, signUp devuelve un user "obfuscado" con `identities` vacío y un
  // id que NO existe en auth.users. Si seguimos, el insert de perfiles falla
  // con FK violation. Detectarlo y devolver un mensaje claro.
  if (!data.user.identities || data.user.identities.length === 0) {
    return {
      error:
        "Ya existe una cuenta con ese email. Iniciá sesión desde /login o usá otro email.",
    };
  }

  // Crear perfil con service role (bypasea RLS y funciona aunque no haya sesión por email confirmation).
  // Si ya existe un perfil con rol admin para este uuid (mismo email reutilizado), abortamos.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle<{ rol: string }>();

  if (existing?.rol === "admin") {
    await supabase.auth.signOut();
    return {
      error:
        "Esta cuenta ya está registrada como administrador. Ingresá desde /admin/login.",
    };
  }

  if (!existing) {
    const { error: perfilError } = await admin.from("perfiles").insert({
      id: data.user.id,
      nombre: parsed.data.nombre,
      rol: "responsable",
    } as never);

    if (perfilError && perfilError.code !== "23505") {
      return {
        error: `Cuenta creada, error al setear perfil: ${perfilError.message}`,
      };
    }
  }

  if (data.session) {
    revalidatePath("/panel", "layout");
    redirect("/panel");
  }

  return { ok: true, pendingConfirmation: true };
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function signInResponsableAction(
  formData: FormData
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const next = String(formData.get("next") ?? "/panel");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // Email no confirmado: Supabase devuelve code "email_not_confirmed" o
    // mensaje "Email not confirmed". Lo detectamos para ofrecer reenvío.
    const isUnconfirmed =
      error?.code === "email_not_confirmed" ||
      /not confirmed/i.test(error?.message ?? "");

    if (isUnconfirmed) {
      return {
        error:
          "Todavía no confirmaste tu email. Revisá tu casilla (incluido spam) y hacé click en el link que te enviamos.",
        needsConfirmation: true,
        email: parsed.data.email,
      };
    }

    return { error: error?.message ?? "Credenciales inválidas." };
  }

  // Garantizar perfil (por si signUp falló en crear perfil o usuario migrado)
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle<{ rol: string }>();

  if (!perfil) {
    const admin = createAdminClient();
    await admin.from("perfiles").insert({
      id: data.user.id,
      nombre: (data.user.user_metadata?.nombre as string) ?? null,
      rol: "responsable",
    } as never);
  } else if (perfil.rol === "admin") {
    // Esta cuenta es admin — no debería entrar al panel responsable.
    // Cerramos sesión y le decimos que use /admin/login.
    await supabase.auth.signOut();
    return {
      error:
        "Esta cuenta es de administrador. Ingresá desde /admin/login.",
    };
  }

  revalidatePath("/panel", "layout");
  redirect(next);
}

export async function signOutPanelAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const forgotSchema = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * Envía email de recupero con `resetPasswordForEmail` (flow nativo de Supabase
 * compatible con PKCE). El link va al callback que canjea el code y redirige
 * a /reset-password con la sesión seteada.
 *
 * Por qué NO usar `admin.generateLink`: server-side genera el code_verifier
 * pero el exchange necesita uno client-side → la sesión queda incompleta y
 * `updateUser` falla con "Invalid login credentials" sin razón aparente.
 *
 * El template del mail (en español) se configura en Supabase Dashboard →
 * Authentication → Email Templates → Reset Password. La infraestructura SMTP
 * ya está apuntando a Resend.
 *
 * Anti-enumeration: si el email no existe Supabase no manda nada y nosotros
 * devolvemos ok igual — no revelamos al usuario si hay cuenta o no.
 */
export async function forgotPasswordAction(
  formData: FormData
): Promise<AuthResult> {
  const parsed = forgotSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    }
  );

  if (error) {
    if (/rate limit|once every/i.test(error.message)) {
      return {
        error:
          "Tenés que esperar unos segundos antes de pedir otro mail de recupero.",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

/**
 * Actualiza el password del usuario actualmente logueado (la sesión la setea
 * /auth/callback al canjear el code del email de recovery). Requiere sesión
 * activa — si no hay, devolvemos error.
 */
export async function resetPasswordAction(
  formData: FormData
): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      error:
        "El link de recupero expiró o no es válido. Pedí uno nuevo desde ¿Olvidaste tu contraseña?",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  return { ok: true };
}

export async function resendConfirmationAction(
  email: string
): Promise<AuthResult> {
  const trimmed = (email ?? "").trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Email inválido." };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/panel`,
    },
  });

  if (error) {
    // Rate limit típico: "For security purposes, you can only request this once every N seconds"
    if (/rate limit|once every/i.test(error.message)) {
      return {
        error:
          "Tenés que esperar unos segundos antes de pedir otro reenvío. Revisá tu casilla, el mail anterior puede estar por llegar.",
      };
    }
    return { error: error.message };
  }

  return { ok: true };
}
