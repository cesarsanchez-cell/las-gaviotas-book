"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentResponsable } from "@/features/panel/lib/auth";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

/**
 * Verifica que el usuario actual sea el responsable dueño del hospedaje al
 * que pertenece la unidad indicada.
 *
 * Por diseño la disponibilidad la maneja SOLO el responsable. El admin puede
 * leer pero NO escribir — el responsable es quien sabe qué puede ofrecer.
 *
 * Devuelve `hospedaje_id` denormalizado para que el caller pueda popularlo
 * en la tabla `disponibilidad` (trigger garantiza consistencia con la unidad).
 */
async function requireResponsableOwnsUnidad(
  unidadId: string
): Promise<{ userId: string; unidadId: string; hospedajeId: string }> {
  const responsable = await getCurrentResponsable();
  if (!responsable || responsable.perfil.rol !== "responsable") {
    throw new Error(
      "Solo el responsable del hospedaje puede modificar la disponibilidad."
    );
  }
  const sb = createAdminClient();
  const { data } = await sb
    .from("unidades")
    .select("hospedaje_id")
    .eq("id", unidadId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!data) throw new Error("Unidad inexistente.");
  if (!(responsable.perfil.hospedajes_ids ?? []).includes(data.hospedaje_id)) {
    throw new Error("Sin permisos sobre este hospedaje.");
  }
  return {
    userId: responsable.id,
    unidadId,
    hospedajeId: data.hospedaje_id,
  };
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

const blockRangeSchema = z
  .object({
    unidadId: z.string().uuid(),
    desde: isoDate,
    hasta: isoDate,
    notas: z
      .string()
      .max(200)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.hasta >= d.desde, {
    path: ["hasta"],
    message: "La fecha hasta debe ser igual o posterior a desde",
  });

/**
 * Bloquea todas las fechas en [desde, hasta] (ambos inclusivos) de la UNIDAD
 * indicada. Idempotente: las ya bloqueadas se ignoran vía ON CONFLICT en
 * (unidad_id, fecha).
 */
export async function bloquearRangoAction(input: {
  unidadId: string;
  desde: string;
  hasta: string;
  notas?: string;
}): Promise<ActionResult> {
  const parsed = blockRangeSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }

  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidad(parsed.data.unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  const fechas: string[] = [];
  const start = new Date(parsed.data.desde + "T00:00:00Z");
  const end = new Date(parsed.data.hasta + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    fechas.push(d.toISOString().slice(0, 10));
  }
  if (fechas.length > 366) {
    return { error: "Rango demasiado grande (máximo 1 año por operación)." };
  }

  const rows = fechas.map((fecha) => ({
    unidad_id: ctx.unidadId,
    hospedaje_id: ctx.hospedajeId,
    fecha,
    tipo: "manual" as const,
    notas: parsed.data.notas ?? null,
    created_by: ctx.userId,
  }));

  const { error } = await sb
    .from("disponibilidad")
    .upsert(rows as never, {
      onConflict: "unidad_id,fecha",
      ignoreDuplicates: true,
    });
  if (error) return { error: error.message };

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

const unblockRangeSchema = blockRangeSchema;

/**
 * Desbloquea (elimina filas) todas las fechas manualmente bloqueadas de la
 * UNIDAD en [desde, hasta]. NO toca filas tipo='reserva' (esas las gestiona
 * Etapa 4 — reservas online).
 */
export async function desbloquearRangoAction(input: {
  unidadId: string;
  desde: string;
  hasta: string;
}): Promise<ActionResult> {
  const parsed = unblockRangeSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidad(parsed.data.unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("disponibilidad")
    .delete()
    .eq("unidad_id", parsed.data.unidadId)
    .eq("tipo", "manual")
    .gte("fecha", parsed.data.desde)
    .lte("fecha", parsed.data.hasta);
  if (error) return { error: error.message };

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

const toggleSchema = z.object({
  unidadId: z.string().uuid(),
  fecha: isoDate,
});

/**
 * Toggle de una fecha individual sobre UNA unidad: si está bloqueada (manual)
 * la libera, si no la bloquea. Pensado para el click directo sobre el
 * calendario.
 * Filas tipo='reserva' se ignoran (no se pueden togglear manualmente).
 */
export async function toggleFechaAction(input: {
  unidadId: string;
  fecha: string;
}): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidad(parsed.data.unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { data: existente } = await sb
    .from("disponibilidad")
    .select("id, tipo")
    .eq("unidad_id", parsed.data.unidadId)
    .eq("fecha", parsed.data.fecha)
    .maybeSingle<{ id: string; tipo: string }>();

  if (existente) {
    if (existente.tipo === "reserva") {
      return {
        error:
          "Esta fecha está ocupada por una reserva, no se puede desbloquear desde el calendario.",
      };
    }
    const { error } = await sb
      .from("disponibilidad")
      .delete()
      .eq("id", existente.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await sb.from("disponibilidad").insert({
      unidad_id: parsed.data.unidadId,
      hospedaje_id: ctx.hospedajeId,
      fecha: parsed.data.fecha,
      tipo: "manual",
      created_by: ctx.userId,
    } as never);
    if (error) return { error: error.message };
  }

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

function revalidate(hospedajeId: string) {
  revalidatePath(`/panel/hospedajes/${hospedajeId}/disponibilidad`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}/disponibilidad`);
  revalidatePath(`/panel/hospedajes/${hospedajeId}/unidades`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}/unidades`);
  // Badge de disponibilidad en consultas se calcula desde esta tabla.
  revalidatePath("/admin/consultas");
  revalidatePath("/panel/leads");
}
