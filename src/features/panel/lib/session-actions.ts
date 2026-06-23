"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/features/consultas/lib/rate-limit";

export interface AuthResult {
  error?: string;
  ok?: boolean;
  pendingConfirmation?: boolean;
  needsConfirmation?: boolean;
  email?: string;
}

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return null;
}

/**
 * Rate-limit para los flujos de auth que MANDAN MAIL (signup, forgot-password,
 * resend). Sin esto, cualquiera puede automatizar POSTs y bombardear una
 * casilla / consumir cuota de Resend+Supabase (F-E1). Dos barreras persistidas
 * (comparten la infra del form de consultas, con claves namespaceadas):
 *   - por IP    → 5 req / 10 min (frena el flood de un mismo origen).
 *   - por email → 3 req / 60 min (protege a una casilla aunque el atacante
 *     rote IPs; el contador sube en cada intento, exista o no la cuenta, así
 *     que no es un vector de enumeración).
 * Devuelve un AuthResult con error si está limitado, o null si puede seguir.
 */
/**
 * Vincula hospedajes/lugares invitados (donde responsable_email coincide con el nuevo usuario).
 * Se llama tras crear el perfil del responsable para establecer las responsabilidades.
 */
async function linkInvitedEntities(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  email: string
): Promise<void> {
  try {
    // Obtener nombre del perfil
    const { data: perfil } = await admin
      .from("perfiles")
      .select("nombre")
      .eq("id", userId)
      .single<{ nombre: string | null }>();

    const responsableName = perfil?.nombre || "";

    // Buscar hospedajes invitados
    const { data: hospedajes } = await admin
      .from("hospedajes")
      .select("id")
      .eq("responsable_email", email)
      .eq("estado", "borrador")
      .returns<{ id: string }[]>();

    if (hospedajes && hospedajes.length > 0) {
      for (const h of hospedajes) {
        // Actualizar responsable_nombre cuando se vincula
        await admin
          .from("hospedajes")
          .update({ responsable_nombre: responsableName } as never)
          .eq("id", h.id);

        // Crear responsabilidad
        await admin.from("responsabilidades").upsert(
          {
            perfil_id: userId,
            entidad_tipo: "hospedaje",
            entidad_id: h.id,
          } as never,
          { onConflict: "perfil_id,entidad_tipo,entidad_id", ignoreDuplicates: true }
        );
      }
    }

    // Buscar lugares gastronómicos invitados (si es que existen)
    const { data: lugares } = await admin
      .from("lugares")
      .select("id")
      .eq("responsable_email", email)
      .eq("estado", "borrador")
      .returns<{ id: string }[]>();

    if (lugares && lugares.length > 0) {
      for (const l of lugares) {
        // Actualizar responsable_nombre cuando se vincula
        await admin
          .from("lugares")
          .update({ responsable_nombre: responsableName } as never)
          .eq("id", l.id);

        // Crear responsabilidad
        await admin.from("responsabilidades").upsert(
          {
            perfil_id: userId,
            entidad_tipo: "lugar",
            entidad_id: l.id,
          } as never,
          { onConflict: "perfil_id,entidad_tipo,entidad_id", ignoreDuplicates: true }
        );
      }
    }
  } catch (e) {
    // Log pero no bloquea — si falla la vinculación, el responsable puede
    // contactar al admin para que lo resuelva.
    console.error("[linkInvitedEntities] Error vinculando entidades:", e);
  }
}

async function authEmailRateLimited(email?: string): Promise<AuthResult | null> {
  const byIp = await checkRateLimit(await getClientIp(), {
    key: "auth",
    max: 5,
    windowSeconds: 600,
  });
  if (!byIp.ok) {
    return {
      error: `Demasiados intentos seguidos. Esperá ${byIp.retryAfter ?? 600} segundos y probá de nuevo.`,
    };
  }

  const normalized = email?.trim().toLowerCase();
  if (normalized) {
    const byEmail = await checkRateLimit(normalized, {
      key: "auth-mail",
      max: 3,
      windowSeconds: 3600,
    });
    if (!byEmail.ok) {
      return {
        error:
          "Se enviaron demasiados mails a esa dirección. Esperá un rato y volvé a intentar.",
      };
    }
  }
  return null;
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

  const limited = await authEmailRateLimited(parsed.data.email);
  if (limited) return limited;

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
    // Anti-enumeration (F-E3): el email ya existe (Supabase devuelve identities
    // vacío). NO lo revelamos — devolvemos la MISMA respuesta que un alta
    // exitosa pendiente de confirmación. Si la cuenta ya existía, Supabase no
    // manda mail de alta, así que el dueño real no recibe ruido.
    return { ok: true, pendingConfirmation: true };
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

    // Vincular hospedajes/lugares invitados (responsable_email coincide con nuevo usuario)
    await linkInvitedEntities(admin, data.user.id, parsed.data.email);
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

/**
 * ¿Existe una cuenta con este email pero todavía SIN confirmar? Se usa para
 * dar el mensaje correcto en el login: Supabase, por anti-enumeration, suele
 * devolver "Invalid login credentials" aunque el problema real sea el email
 * sin confirmar. Falla silencioso a `false` (cae al mensaje genérico).
 */
async function emailExisteSinConfirmar(email: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const u = data.users.find(
      (x) => x.email?.toLowerCase() === email.toLowerCase()
    );
    return Boolean(u && !u.email_confirmed_at);
  } catch {
    return false;
  }
}

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
    // Email no confirmado: a veces Supabase devuelve code "email_not_confirmed"
    // o mensaje "Email not confirmed"...
    const isUnconfirmed =
      error?.code === "email_not_confirmed" ||
      /not confirmed/i.test(error?.message ?? "");

    // ...pero por anti-enumeration MUCHAS veces devuelve el genérico "Invalid
    // login credentials" aunque el problema real sea que falta confirmar el
    // email. Eso hacía que el usuario viera "contraseña inválida" con la pass
    // correcta. Si el error es genérico, miramos si la cuenta existe sin
    // confirmar y damos el mensaje correcto.
    const emailSinConfirmar =
      isUnconfirmed || (await emailExisteSinConfirmar(parsed.data.email));

    if (emailSinConfirmar) {
      return {
        error:
          "Todavía no confirmaste tu email. Revisá tu casilla (incluido spam) y hacé click en el link que te enviamos.",
        needsConfirmation: true,
        email: parsed.data.email,
      };
    }

    return { error: "Email o contraseña incorrectos." };
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
  context: z.enum(["admin", "responsable"]).optional(),
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
  const ctxRaw = String(formData.get("context") ?? "").trim();
  const parsed = forgotSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    context: ctxRaw === "admin" || ctxRaw === "responsable" ? ctxRaw : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const limited = await authEmailRateLimited(parsed.data.email);
  if (limited) return limited;

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";

  // Pasamos el contexto (admin|responsable) al /reset-password para que
  // sepa a qué login devolver al usuario tras el reset. Lo metemos como
  // query string del `next` URL-encoded.
  const resetPath = parsed.data.context
    ? `/reset-password?for=${parsed.data.context}`
    : "/reset-password";
  const nextEncoded = encodeURIComponent(resetPath);

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=${nextEncoded}`,
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

  // Después de updateUser la sesión puede quedar en estado raro (Supabase
  // rota refresh tokens). Cerramos para forzar un login limpio con la nueva
  // contraseña. El cliente redirige a la login page correcta según rol.
  await supabase.auth.signOut();

  return { ok: true };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Máximo 72 caracteres"),
    confirm: z.string().min(8).max(72),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Las contraseñas nuevas no coinciden.",
    path: ["confirm"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "La contraseña nueva tiene que ser distinta a la actual.",
    path: ["newPassword"],
  });

/**
 * Cambio de password para usuario logueado. Valida la contraseña actual
 * intentando `signInWithPassword` server-side (Supabase no expone una API
 * "reauthenticate" directa pero sí `signInWithPassword` que falla con
 * "Invalid login credentials" si la actual no matchea). Si pasa, actualiza
 * con `updateUser`.
 *
 * Requiere sesión activa. Se usa desde /panel/perfil y /admin/perfil.
 */
export async function changePasswordAction(
  formData: FormData
): Promise<AuthResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return { error: "Sesión expirada. Volvé a ingresar." };
  }

  // Verificar contraseña actual sin tocar la sesión SSR del usuario.
  // Creamos un cliente Supabase descartable (anon key, sin persistencia) y
  // intentamos signInWithPassword. Si falla, la actual no es correcta.
  const { createClient: createPlainClient } = await import("@supabase/supabase-js");
  const verifier = createPlainClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return { error: "La contraseña actual no es correcta." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) return { error: updateError.message };

  return { ok: true };
}

export async function resendConfirmationAction(
  email: string
): Promise<AuthResult> {
  const trimmed = (email ?? "").trim();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Email inválido." };
  }

  const limited = await authEmailRateLimited(trimmed);
  if (limited) return limited;

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
