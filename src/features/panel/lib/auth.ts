import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PerfilRow } from "@/types/database";

export interface ResponsableUser {
  id: string;
  email: string;
  perfil: PerfilRow;
  /**
   * IDs de hospedajes que este usuario gestiona, según `responsabilidades`.
   * Funciona tanto para rol=responsable como para rol=admin con
   * responsabilidades (operador + admin local). Es la fuente de verdad —
   * `perfil.hospedajes_ids` queda como legacy de compatibilidad.
   */
  hospedajeIds: string[];
  /** IDs de lugares gastronómicos que este usuario gestiona. */
  lugarIds: string[];
  /**
   * true si el perfil además tiene rol=admin (admin local u super admin).
   * Sirve para mostrar el link "Volver al panel de administración" en el
   * sidebar del panel.
   */
  isAlsoAdmin: boolean;
}

async function loadResponsabilidades(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ hospedajeIds: string[]; lugarIds: string[] }> {
  const { data } = await supabase
    .from("responsabilidades")
    .select("entidad_tipo, entidad_id")
    .eq("perfil_id", userId)
    .returns<Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }>>();
  const hospedajeIds = (data ?? [])
    .filter((r) => r.entidad_tipo === "hospedaje")
    .map((r) => r.entidad_id);
  const lugarIds = (data ?? [])
    .filter((r) => r.entidad_tipo === "lugar")
    .map((r) => r.entidad_id);
  return { hospedajeIds, lugarIds };
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

  const { hospedajeIds, lugarIds } = await loadResponsabilidades(
    supabase,
    user.id
  );

  return {
    id: user.id,
    email: user.email ?? "",
    perfil,
    hospedajeIds,
    lugarIds,
    isAlsoAdmin: perfil.rol === "admin",
  };
}

/**
 * Garantiza sesión con acceso al panel /panel.
 *
 * Permite entrar si rol = 'responsable' o rol = 'admin' (operador puro o
 * admin local que también gestiona entidades propias). Para administradores
 * que entren sin responsabilidades, la vista del panel mostrará empty state
 * con botones para cargar la primera entidad — chicken-and-egg evitado.
 *
 * Redirecciona a /login si no hay sesión.
 */
export async function requireResponsable(): Promise<ResponsableUser> {
  const user = await getCurrentResponsable();
  if (!user) redirect("/login");
  return user;
}
