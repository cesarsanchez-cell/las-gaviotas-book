"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import type { DatoUtil } from "@/lib/types";
import {
  crearDatoUtilSchema,
  actualizarDatoUtilSchema,
  type CrearDatoUtilInput,
  type ActualizarDatoUtilInput,
} from "./datos-utiles-schema";

export async function crearDatoUtilAction(
  destinoId: string,
  input: CrearDatoUtilInput
): Promise<DatoUtil> {
  const me = await requireAdmin();
  // Admin local solo puede crear en su destino
  if (!me.isSuperAdmin && me.destinoId !== destinoId) {
    throw new Error("No tenés permiso para crear datos útiles en ese destino.");
  }

  const parsed = crearDatoUtilSchema.parse(input);

  const sb = createAdminClient();
  const insertData = {
    destino_id: destinoId,
    rubro_id: parsed.rubroId,
    nombre: parsed.nombre,
    direccion: parsed.direccion || null,
    contacto: parsed.contacto || null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from("datos_utiles") as any)
    .insert([insertData])
    .select("*")
    .single();

  if (error) throw error;
  return data as DatoUtil;
}

export async function actualizarDatoUtilAction(
  datoUtilId: string,
  input: ActualizarDatoUtilInput
): Promise<DatoUtil> {
  const me = await requireAdmin();
  const sb = createAdminClient();

  // Obtener el dato_util para validar que pertenezca al destino del admin
  const { data: datoUtil, error: fetchError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.from("datos_utiles") as any
  )
    .select("destino_id")
    .eq("id", datoUtilId)
    .single();

  if (fetchError || !datoUtil) throw new Error("Dato útil no encontrado.");

  // Admin local solo puede actualizar datos de su destino
  if (!me.isSuperAdmin && me.destinoId !== datoUtil.destino_id) {
    throw new Error("No tenés permiso para actualizar este dato útil.");
  }

  const parsed = actualizarDatoUtilSchema.parse(input);

  const updateData = {
    nombre: parsed.nombre,
    direccion: parsed.direccion || null,
    contacto: parsed.contacto || null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from("datos_utiles") as any)
    .update(updateData)
    .eq("id", datoUtilId)
    .select("*")
    .single();

  if (error) throw error;
  return data as DatoUtil;
}

export async function eliminarDatoUtilAction(datoUtilId: string) {
  const me = await requireAdmin();
  const sb = createAdminClient();

  // Obtener el dato_util para validar que pertenezca al destino del admin
  const { data: datoUtil, error: fetchError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.from("datos_utiles") as any
  )
    .select("destino_id")
    .eq("id", datoUtilId)
    .single();

  if (fetchError || !datoUtil) throw new Error("Dato útil no encontrado.");

  // Admin local solo puede eliminar datos de su destino
  if (!me.isSuperAdmin && me.destinoId !== datoUtil.destino_id) {
    throw new Error("No tenés permiso para eliminar este dato útil.");
  }

  const { error } = await sb
    .from("datos_utiles")
    .delete()
    .eq("id", datoUtilId);

  if (error) throw error;
}
