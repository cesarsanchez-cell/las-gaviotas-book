"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LoginResult {
  error?: string;
}

export async function signInAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Por anti-enumeration Supabase suele devolver el genérico "Invalid login
    // credentials" aunque el problema real sea que falta confirmar el email.
    // Lo distinguimos para no mostrar "contraseña inválida" engañoso.
    try {
      const admin = createAdminClient();
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const u = list.users.find(
        (x) => x.email?.toLowerCase() === email.toLowerCase()
      );
      if (u && !u.email_confirmed_at) {
        return {
          error:
            "Todavía no confirmaste tu email. Revisá tu casilla (incluido spam) y hacé click en el link que te enviamos.",
        };
      }
    } catch {
      // si el lookup falla, caemos al mensaje genérico
    }
    return { error: "Email o contraseña incorrectos." };
  }

  // Verificar rol admin
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle<{ rol: string }>();

  if (!perfil || perfil.rol !== "admin") {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene permisos de administrador." };
  }

  revalidatePath("/admin", "layout");
  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
