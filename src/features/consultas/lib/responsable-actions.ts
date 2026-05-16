"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireResponsable } from "@/features/panel/lib/auth";
import type { EstadoConsulta } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

const updateEstadoSchema = z.object({
  consultaId: z.string().uuid(),
  estado: z.enum(["nueva", "leida", "respondida", "descartada"]),
});

/**
 * Cambia el estado de una consulta desde el panel del responsable.
 *
 * Verifica que la consulta sea de un hospedaje del responsable autenticado
 * leyendo perfil.hospedajes_ids y comparando con hospedaje_id de la consulta.
 * Defensa en código sobre la RLS (que ya filtra select/update via
 * responsable_owns_hospedaje, pero usamos service role aquí para tener
 * mensajes de error claros y revalidatePath consistente).
 *
 * El responsable NO puede borrar consultas — para descartar usa estado
 * 'descartada'. Solo admin con scope puede hacer DELETE.
 */
export async function updateConsultaEstadoResponsableAction(input: {
  consultaId: string;
  estado: EstadoConsulta;
}): Promise<ActionResult> {
  const user = await requireResponsable();
  const parsed = updateEstadoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const sb = createAdminClient();
  const { data: consulta } = await sb
    .from("consultas")
    .select("hospedaje_id")
    .eq("id", parsed.data.consultaId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!consulta) return { error: "Consulta no encontrada." };

  const hospedajesIds = user.perfil.hospedajes_ids ?? [];
  if (!hospedajesIds.includes(consulta.hospedaje_id)) {
    return { error: "No tenés permiso para gestionar esta consulta." };
  }

  const { error } = await sb
    .from("consultas")
    .update({ estado: parsed.data.estado } as never)
    .eq("id", parsed.data.consultaId);
  if (error) return { error: error.message };

  revalidatePath("/panel/leads");
  revalidatePath("/panel");
  return { ok: true };
}
