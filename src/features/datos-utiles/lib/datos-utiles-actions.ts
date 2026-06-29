"use server";

import { createAdminClient } from "@/lib/supabase/admin";
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
  const parsed = actualizarDatoUtilSchema.parse(input);

  const sb = createAdminClient();
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
  const sb = createAdminClient();
  const { error } = await sb
    .from("datos_utiles")
    .delete()
    .eq("id", datoUtilId);

  if (error) throw error;
}
