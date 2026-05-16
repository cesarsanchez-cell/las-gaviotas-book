import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/features/admin/lib/auth";

/**
 * Verifica que el admin tenga permiso para tocar este hospedaje.
 *
 * - Super admin (destinoId=null) pasa todos los chequeos.
 * - Admin local: el hospedaje debe pertenecer a su destino.
 *
 * Lanza `Error` si no encuentra el hospedaje o si está fuera del scope.
 * Devuelve el `destino_id` del hospedaje para reuso del caller.
 *
 * Uso desde server actions que mutan vía service role (createAdminClient)
 * y por ende bypasean RLS — necesitamos chequear el scope en código.
 */
export async function assertAdminCanAccessHospedaje(
  admin: AdminUser,
  hospedajeId: string
): Promise<string> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("hospedajes")
    .select("destino_id")
    .eq("id", hospedajeId)
    .maybeSingle<{ destino_id: string }>();

  if (!data) throw new Error("Hospedaje no encontrado.");
  if (admin.isSuperAdmin) return data.destino_id;
  if (data.destino_id !== admin.destinoId) {
    throw new Error("No tenés permiso para gestionar este hospedaje.");
  }
  return data.destino_id;
}

/**
 * Verifica que el admin tenga permiso sobre un destino dado.
 *
 * - Super admin pasa siempre.
 * - Admin local: solo su propio destino.
 *
 * Útil cuando una mutación no parte de un hospedaje existente sino que
 * recibe directamente `destino_id` en el payload (ej. createHospedajeAction).
 */
export function assertAdminCanAccessDestino(
  admin: AdminUser,
  destinoId: string
): void {
  if (admin.isSuperAdmin) return;
  if (destinoId !== admin.destinoId) {
    throw new Error("No tenés permiso para crear contenido en este destino.");
  }
}
