"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  restriccionInputSchema,
  restriccionUpdateSchema,
} from "@/features/restricciones/lib/validation";

export interface RestriccionActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Resuelve si el usuario logueado puede gestionar restricciones del
 * unidad_type:
 *   - responsable del hospedaje al que pertenece el tipo (vía
 *     `responsabilidades`, fuente de verdad), o
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
    .maybeSingle<{ rol: string; destino_id: string | null }>();
  if (!perfil) return null;

  if (perfil.rol === "responsable") {
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

function collectFieldErrors(
  issues: { path: (string | number)[]; message: string }[]
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function revalidateUnidad(hospedajeId: string, unidadTypeId: string) {
  revalidatePath(`/panel/hospedajes/${hospedajeId}/unidades/${unidadTypeId}`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}/unidades/${unidadTypeId}`);
}

export async function createRestriccionAction(
  rawInput: unknown
): Promise<RestriccionActionResult> {
  const parsed = restriccionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: "Datos inválidos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const input = parsed.data;

  const auth = await authorizeUnidadType(input.unidadTypeId);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const sb = createAdminClient();
  const { error } = await sb.from("restricciones").insert({
    unidad_type_id: input.unidadTypeId,
    hospedaje_id: auth.hospedajeId,
    nombre: input.nombre,
    desde: input.desde,
    hasta: input.hasta,
    estadia_minima_noches: input.estadiaMinimaNoches ?? null,
    dia_ingreso: input.diaIngreso ?? null,
    dia_egreso: input.diaEgreso ?? null,
    notas: input.notas ?? null,
  } as never);
  if (error) {
    return { error: `No se pudo crear la restricción: ${error.message}` };
  }

  revalidateUnidad(auth.hospedajeId, input.unidadTypeId);
  return { ok: true };
}

export async function updateRestriccionAction(
  rawInput: unknown
): Promise<RestriccionActionResult> {
  const parsed = restriccionUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      error: "Datos inválidos.",
      fieldErrors: collectFieldErrors(parsed.error.issues),
    };
  }
  const input = parsed.data;

  const auth = await authorizeUnidadType(input.unidadTypeId);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("restricciones")
    .update({
      nombre: input.nombre,
      desde: input.desde,
      hasta: input.hasta,
      estadia_minima_noches: input.estadiaMinimaNoches ?? null,
      dia_ingreso: input.diaIngreso ?? null,
      dia_egreso: input.diaEgreso ?? null,
      notas: input.notas ?? null,
    } as never)
    .eq("id", input.id)
    .eq("unidad_type_id", input.unidadTypeId);
  if (error) {
    return { error: `No se pudo actualizar: ${error.message}` };
  }

  revalidateUnidad(auth.hospedajeId, input.unidadTypeId);
  return { ok: true };
}

export async function deleteRestriccionAction(
  restriccionId: string
): Promise<RestriccionActionResult> {
  const sb = createAdminClient();
  const { data: restriccion } = await sb
    .from("restricciones")
    .select("unidad_type_id, hospedaje_id")
    .eq("id", restriccionId)
    .maybeSingle<{ unidad_type_id: string; hospedaje_id: string }>();
  if (!restriccion) return { error: "La restricción no existe." };

  const auth = await authorizeUnidadType(restriccion.unidad_type_id);
  if (!auth) return { error: "No tenés permisos para esta unidad." };

  const { error } = await sb
    .from("restricciones")
    .delete()
    .eq("id", restriccionId);
  if (error) return { error: `No se pudo borrar: ${error.message}` };

  revalidateUnidad(restriccion.hospedaje_id, restriccion.unidad_type_id);
  return { ok: true };
}
