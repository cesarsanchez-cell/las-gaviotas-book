import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PerfilRow } from "@/types/database";

export interface ResponsableUser {
  id: string;
  email: string;
  perfil: PerfilRow;
}

/** Sesion responsable o null. No redirect. */
export async function getCurrentResponsable(): Promise<ResponsableUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<PerfilRow>();

  if (!perfil) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    perfil,
  };
}

/**
 * Garantiza sesión responsable. Redirect a /login si no hay sesión, o a /admin
 * si la sesión activa es de un admin (no compartimos panel — cada rol al suyo).
 */
export async function requireResponsable(): Promise<ResponsableUser> {
  const user = await getCurrentResponsable();
  if (!user) redirect("/login");
  if (user.perfil.rol === "admin") redirect("/admin");
  return user;
}
