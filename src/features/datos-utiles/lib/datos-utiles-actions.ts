"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  crearDatoUtilSchema,
  actualizarDatoUtilSchema,
  type CrearDatoUtilInput,
  type ActualizarDatoUtilInput,
} from "./datos-utiles-schema";

export async function crearDatoUtilAction(
  destinoId: string,
  input: CrearDatoUtilInput
) {
  const parsed = crearDatoUtilSchema.parse(input);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("datos_utiles")
    .insert({
      destino_id: destinoId,
      rubro_id: parsed.rubroId,
      nombre: parsed.nombre,
      direccion: parsed.direccion || null,
      contacto: parsed.contacto || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function actualizarDatoUtilAction(
  datoUtilId: string,
  input: ActualizarDatoUtilInput
) {
  const parsed = actualizarDatoUtilSchema.parse(input);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("datos_utiles")
    .update({
      nombre: parsed.nombre,
      direccion: parsed.direccion || null,
      contacto: parsed.contacto || null,
    })
    .eq("id", datoUtilId)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function eliminarDatoUtilAction(datoUtilId: string) {
  const sb = createAdminClient();
  const { error } = await sb
    .from("datos_utiles")
    .delete()
    .eq("id", datoUtilId);

  if (error) throw error;
}
