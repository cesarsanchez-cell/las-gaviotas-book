"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  tarifaInputSchema,
  tarifaUpdateSchema,
} from "@/features/tarifas/lib/validation";

export interface TarifaActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Resuelve si el usuario logueado puede gestionar tarifas del unidad_type:
 *   - responsable del hospedaje al que pertenece el tipo, o
 *   - admin con scope sobre el destino del hospedaje.
 * Devuelve { hospedajeId } si pasa, o null si no.
 */
async function authorizeUnidadType(
  unidadTypeId: string
): Promise<{ hospedajeId: string } | null> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: tipo } = await admin
    .from("unidad_types")
    .select("hospedaje_id")
    .eq("id", unidadTypeId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!tipo) return null;

  const { data: perfil } = await admin
    .from("perfiles")
    .select("rol, destino_id")
    .eq("id", user.id)
    .maybeSingle<{
      rol: string;
      destino_id: string | null;
    }>();
  if (!perfil) return null;

  if (perfil.rol === "responsable") {
    // Ownership vía `responsabilidades` (fuente de verdad), no por el array
    // legacy `perfiles.hospedajes_ids[]` — que puede quedar desincronizado.
    const { data: resp } = await admin
      .from("responsabilidades")
      .select("entidad_id")
      .eq("perfil_id", user.id)
      .eq("entidad_tipo", "hospedaje")
      .eq("entidad_id", tipo.hospedaje_id)
      .maybeSingle<{ entidad_id: string }>();
    if (!resp) return null;
    return { hospedajeId: tipo.hospedaje_id };
  }

  if (perfil.rol === "admin") {
    // Super admin (destino_id null) pasa siempre. Admin local solo si el
    // hospedaje pertenece a su destino.
    if (perfil.destino_id == null) {
      return { hospedajeId: tipo.hospedaje_id };
    }
    const { data: h } = await admin
      .from("hospedajes")
      .select("destino_id")
      .eq("id", tipo.hospedaje_id)
      .maybeSingle<{ destino_id: string }>();
    if (h?.destino_id === perfil.destino_id) {
      return { hospedajeId: tipo.hospedaje_id };
    }
  }

  return null;
}

export async function createTarifaAction(
  rawInput: unknown
): Promise<TarifaActionResult> {
  const parsed = tarifaInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }
  const input = parsed.data;

  const auth = await authorizeUnidadType(input.unidadTypeId);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const sb = createAdminClient();
  const { error } = await sb.from("tarifas").insert({
    unidad_type_id: input.unidadTypeId,
    hospedaje_id: auth.hospedajeId,
    nombre: input.nombre,
    desde: input.desde,
    hasta: input.hasta,
    precio_noche: input.precioNoche,
    moneda: input.moneda,
    notas: input.notas ?? null,
  } as never);
  if (error) {
    return { error: `No se pudo crear la tarifa: ${error.message}` };
  }

  revalidatePath(`/panel/hospedajes/${auth.hospedajeId}/unidades/${input.unidadTypeId}`);
  revalidatePath(`/admin/hospedajes/${auth.hospedajeId}/unidades/${input.unidadTypeId}`);
  return { ok: true };
}

export async function updateTarifaAction(
  rawInput: unknown
): Promise<TarifaActionResult> {
  const parsed = tarifaUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }
  const input = parsed.data;

  const auth = await authorizeUnidadType(input.unidadTypeId);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("tarifas")
    .update({
      nombre: input.nombre,
      desde: input.desde,
      hasta: input.hasta,
      precio_noche: input.precioNoche,
      moneda: input.moneda,
      notas: input.notas ?? null,
    } as never)
    .eq("id", input.id)
    .eq("unidad_type_id", input.unidadTypeId);
  if (error) {
    return { error: `No se pudo actualizar: ${error.message}` };
  }

  revalidatePath(`/panel/hospedajes/${auth.hospedajeId}/unidades/${input.unidadTypeId}`);
  revalidatePath(`/admin/hospedajes/${auth.hospedajeId}/unidades/${input.unidadTypeId}`);
  return { ok: true };
}

export async function deleteTarifaAction(
  tarifaId: string
): Promise<TarifaActionResult> {
  const sb = createAdminClient();
  const { data: tarifa } = await sb
    .from("tarifas")
    .select("unidad_type_id, hospedaje_id")
    .eq("id", tarifaId)
    .maybeSingle<{ unidad_type_id: string; hospedaje_id: string }>();
  if (!tarifa) return { error: "La tarifa no existe." };

  const auth = await authorizeUnidadType(tarifa.unidad_type_id);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const { error } = await sb.from("tarifas").delete().eq("id", tarifaId);
  if (error) return { error: `No se pudo borrar: ${error.message}` };

  revalidatePath(`/panel/hospedajes/${tarifa.hospedaje_id}/unidades/${tarifa.unidad_type_id}`);
  revalidatePath(`/admin/hospedajes/${tarifa.hospedaje_id}/unidades/${tarifa.unidad_type_id}`);
  return { ok: true };
}
