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
  input: CrearDatoUtilInput
): Promise<DatoUtil> {
  const me = await requireAdmin();
  const parsed = crearDatoUtilSchema.parse(input);

  // Validar permisos según scope
  // - Super admin: puede crear cualquier scope
  // - Admin local: solo scope='destino' de su destino
  if (!me.isSuperAdmin) {
    if (parsed.scopeType !== "destino" || parsed.scopeId !== me.destinoId) {
      throw new Error(
        "No tenés permiso para crear datos útiles en ese scope. Solo podés crear en tu destino."
      );
    }
  }

  const sb = createAdminClient();
  const insertData = {
    rubro_id: parsed.rubroId,
    nombre: parsed.nombre,
    direccion: parsed.direccion || null,
    contacto: parsed.contacto || null,
    scope_type: parsed.scopeType,
    scope_id: parsed.scopeId,
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

  // Obtener el dato_util para validar permisos
  const { data: datoUtil, error: fetchError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.from("datos_utiles") as any
  )
    .select("scope_type, scope_id")
    .eq("id", datoUtilId)
    .single();

  if (fetchError || !datoUtil) throw new Error("Dato útil no encontrado.");

  // Validar permisos según scope
  // - Super admin: puede actualizar cualquier scope
  // - Admin local: solo scope='destino' de su destino
  if (!me.isSuperAdmin) {
    if (datoUtil.scope_type !== "destino" || datoUtil.scope_id !== me.destinoId) {
      throw new Error("No tenés permiso para actualizar este dato útil.");
    }
  }

  const parsed = actualizarDatoUtilSchema.parse(input);

  // Validar que no intente cambiar rubro/scope sin ser super admin
  if (!me.isSuperAdmin) {
    if (parsed.rubroId) {
      throw new Error(
        "Solo Super Admin puede cambiar el rubro de un dato útil."
      );
    }
    if (parsed.scopeType || parsed.scopeId) {
      throw new Error(
        "Solo Super Admin puede cambiar la cobertura geográfica de un dato útil."
      );
    }
  }

  const updateData: Record<string, unknown> = {
    nombre: parsed.nombre,
    direccion: parsed.direccion || null,
    contacto: parsed.contacto || null,
  };

  // Solo super admin puede cambiar rubro y scope
  if (me.isSuperAdmin) {
    if (parsed.rubroId) updateData.rubro_id = parsed.rubroId;
    if (parsed.scopeType && parsed.scopeId) {
      updateData.scope_type = parsed.scopeType;
      updateData.scope_id = parsed.scopeId;
    }
  }

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

  // Obtener el dato_util para validar permisos
  const { data: datoUtil, error: fetchError } = await (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sb.from("datos_utiles") as any
  )
    .select("scope_type, scope_id")
    .eq("id", datoUtilId)
    .single();

  if (fetchError || !datoUtil) throw new Error("Dato útil no encontrado.");

  // Validar permisos según scope
  // - Super admin: puede eliminar cualquier scope
  // - Admin local: solo scope='destino' de su destino
  if (!me.isSuperAdmin) {
    if (datoUtil.scope_type !== "destino" || datoUtil.scope_id !== me.destinoId) {
      throw new Error("No tenés permiso para eliminar este dato útil.");
    }
  }

  const { error } = await sb
    .from("datos_utiles")
    .delete()
    .eq("id", datoUtilId);

  if (error) throw error;
}
