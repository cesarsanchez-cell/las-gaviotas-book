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
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { nombre: parsed.data.nombre },
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "No se pudo crear el usuario." };

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
