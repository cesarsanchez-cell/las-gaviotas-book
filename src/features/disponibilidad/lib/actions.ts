"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentResponsable } from "@/features/panel/lib/auth";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

interface AccessContext {
  userId: string;
}

/**
 * Verifica que el usuario actual pueda gestionar disponibilidad del hospedaje.
 *
 * - Admin: vía assertAdminCanAccessHospedaje (super pasa todo, local solo su destino).
 * - Responsable: hospedaje en su perfil.hospedajes_ids.
 */
async function requireAccessToHospedaje(
  hospedajeId: string
): Promise<AccessContext> {
  const admin = await getCurrentAdmin();
  if (admin) {
    await assertAdminCanAccessHospedaje(admin, hospedajeId);
    return { userId: admin.id };
  }

  const responsable = await getCurrentResponsable();
  if (responsable && responsable.perfil.rol === "responsable") {
    if (!(responsable.perfil.hospedajes_ids ?? []).includes(hospedajeId)) {
      throw new Error("Sin permisos sobre este hospedaje.");
    }
    return { userId: responsable.id };
  }

  throw new Error("No autenticado.");
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

const blockRangeSchema = z
  .object({
    hospedajeId: z.string().uuid(),
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
 * Bloquea todas las fechas en [desde, hasta] (ambos inclusivos) del
 * hospedaje. Idempotente: si una fecha ya está bloqueada, se ignora vía
 * ON CONFLICT.
 */
export async function bloquearRangoAction(input: {
  hospedajeId: string;
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

  let ctx: AccessContext;
  try {
    ctx = await requireAccessToHospedaje(parsed.data.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  // Generar lista de fechas entre desde y hasta inclusive.
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
    hospedaje_id: parsed.data.hospedajeId,
    fecha,
    tipo: "manual" as const,
    notas: parsed.data.notas ?? null,
    created_by: ctx.userId,
  }));

  const { error } = await sb
    .from("disponibilidad")
    .upsert(rows as never, { onConflict: "hospedaje_id,fecha", ignoreDuplicates: true });
  if (error) return { error: error.message };

  revalidatePath(`/panel/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  revalidatePath(`/admin/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  return { ok: true };
}

const unblockRangeSchema = blockRangeSchema;

/**
 * Desbloquea (elimina filas) todas las fechas manualmente bloqueadas en
 * [desde, hasta]. NO toca filas tipo='reserva' (esas las gestiona Etapa 4).
 */
export async function desbloquearRangoAction(input: {
  hospedajeId: string;
  desde: string;
  hasta: string;
}): Promise<ActionResult> {
  const parsed = unblockRangeSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await requireAccessToHospedaje(parsed.data.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("disponibilidad")
    .delete()
    .eq("hospedaje_id", parsed.data.hospedajeId)
    .eq("tipo", "manual")
    .gte("fecha", parsed.data.desde)
    .lte("fecha", parsed.data.hasta);
  if (error) return { error: error.message };

  revalidatePath(`/panel/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  revalidatePath(`/admin/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  return { ok: true };
}

const toggleSchema = z.object({
  hospedajeId: z.string().uuid(),
  fecha: isoDate,
});

/**
 * Toggle de una fecha individual: si está bloqueada (manual) la libera,
 * sino la bloquea. Pensado para el click directo sobre el calendario.
 * Filas tipo='reserva' se ignoran (no se pueden togglear manualmente).
 */
export async function toggleFechaAction(input: {
  hospedajeId: string;
  fecha: string;
}): Promise<ActionResult> {
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx: AccessContext;
  try {
    ctx = await requireAccessToHospedaje(parsed.data.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { data: existente } = await sb
    .from("disponibilidad")
    .select("id, tipo")
    .eq("hospedaje_id", parsed.data.hospedajeId)
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
      hospedaje_id: parsed.data.hospedajeId,
      fecha: parsed.data.fecha,
      tipo: "manual",
      created_by: ctx.userId,
    } as never);
    if (error) return { error: error.message };
  }

  revalidatePath(`/panel/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  revalidatePath(`/admin/hospedajes/${parsed.data.hospedajeId}/disponibilidad`);
  return { ok: true };
}
