import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PerfilRow } from "@/types/database";

export interface AdminUser {
  id: string;
  email: string;
  perfil: PerfilRow;
}

/**
 * Devuelve el admin actual o null. Para usar en Server Components.
 * No hace redirect.
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
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

  if (!perfil || perfil.rol !== "admin") return null;

  return {
    id: user.id,
    email: user.email ?? "",
    perfil,
  };
}

/**
 * Garantiza que hay un admin logueado. Redirect a login si no.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
