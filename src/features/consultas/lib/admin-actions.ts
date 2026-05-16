"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import type { EstadoConsulta } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

const updateEstadoSchema = z.object({
  consultaId: z.string().uuid(),
  estado: z.enum(["nueva", "leida", "respondida", "descartada"]),
});

/**
 * Cambia el estado de una consulta (leída / respondida / descartada / vuelta
 * a nueva). Verifica scope: super admin pasa, admin local solo si la
 * consulta es de un hospedaje de su destino.
 */
export async function updateConsultaEstadoAction(input: {
  consultaId: string;
  estado: EstadoConsulta;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateEstadoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const sb = createAdminClient();
  const { data: consulta } = await sb
    .from("consultas")
    .select("hospedaje_id")
    .eq("id", parsed.data.consultaId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!consulta) return { error: "Consulta no encontrada." };

  try {
    await assertAdminCanAccessHospedaje(admin, consulta.hospedaje_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await sb
    .from("consultas")
    .update({ estado: parsed.data.estado } as never)
    .eq("id", parsed.data.consultaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/consultas");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Borra una consulta (purga real, no soft delete). Solo admin con scope.
 * Pensado para casos de spam que pasaron el honeypot — para descartar
 * normal usar updateConsultaEstadoAction con 'descartada'.
 */
export async function deleteConsultaAction(
  consultaId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = z.string().uuid().safeParse(consultaId);
  if (!parsed.success) return { error: "ID inválido." };

  const sb = createAdminClient();
  const { data: consulta } = await sb
    .from("consultas")
    .select("hospedaje_id")
    .eq("id", consultaId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!consulta) return { error: "Consulta no encontrada." };

  try {
    await assertAdminCanAccessHospedaje(admin, consulta.hospedaje_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await sb.from("consultas").delete().eq("id", consultaId);
  if (error) return { error: error.message };

  revalidatePath("/admin/consultas");
  revalidatePath("/admin");
  return { ok: true };
}
