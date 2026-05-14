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
 * Garantiza que hay un admin logueado.
 * Si no hay sesión: redirect a /admin/login.
 * Si hay sesión pero NO es admin: redirect a /panel (evita loops con middleware).
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<PerfilRow>();

  if (!perfil) redirect("/admin/login");
  if (perfil.rol !== "admin") redirect("/panel");

  return {
    id: user.id,
    email: user.email ?? "",
    perfil,
  };
}
