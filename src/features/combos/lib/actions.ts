"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { requireAdmin } from "@/features/admin/lib/auth";
import { requireResponsable } from "@/features/panel/lib/auth";
import { assertAdminCanAccessDestino } from "@/features/admin/lib/scope";
import { comboSchema, parseFormDataToCombo, type ComboInput } from "./combo-schema";
import {
  getComboById,
  getComercioDestinoId,
  getComercioZonasIds,
  getResponsableDestinoIds,
} from "./queries";
import { notifyComboPublicado, notifyComboRechazado } from "./notifications";
import type { EstadoCombo } from "@/types/database";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "items";
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

function revalidateCombos() {
  revalidatePath("/admin/combos");
  revalidatePath("/admin/validaciones");
  revalidatePath("/panel/combos");
  revalidatePath("/panel");
}

/** Valida que todos los items compartan al menos una zona, retorna el destino del primer item. */
async function deriveDestino(
  items: ComboInput["items"]
): Promise<{ destinoId: string } | { error: string }> {
  if (items.length === 0) {
    return { error: "El combo necesita al menos 2 comercios." };
  }

  // Obtener zonas de cada comercio
  const zonasArray: string[][] = [];
  const destinos = new Set<string>();

  for (const it of items) {
    const zones = await getComercioZonasIds(it.comercio_tipo, it.comercio_id);
    if (zones === null) {
      return { error: "Uno de los comercios no existe o cambió de tipo." };
    }
    if (zones.length === 0) {
      return { error: `${it.comercio_tipo} no pertenece a ninguna zona.` };
    }
    zonasArray.push(zones);

    // También guardar el destino del primer item (para usarlo como ancla)
    const destId = await getComercioDestinoId(it.comercio_tipo, it.comercio_id);
    if (destId) destinos.add(destId);
  }

  // Validar que todos compartan al menos una zona (intersección)
  const zonasComunes = new Set(zonasArray[0]);
  for (let i = 1; i < zonasArray.length; i++) {
    const actuales = new Set(zonasArray[i]);
    zonasComunes.forEach((z) => {
      if (!actuales.has(z)) zonasComunes.delete(z);
    });
  }

  if (zonasComunes.size === 0) {
    return { error: "Todos los comercios del combo deben pertenecer a la misma zona." };
  }

  // Usar el destino del primer item como ancla del combo
  const anchorDestino = [...destinos][0];
  if (!anchorDestino) {
    return { error: "No se pudo determinar el destino del combo." };
  }

  return { destinoId: anchorDestino };
}

async function writeItems(comboId: string, items: ComboInput["items"]) {
  const sb = createAdminClient();
  await sb.from("combo_items").delete().eq("combo_id", comboId);
  await sb.from("combo_items").insert(
    items.map((it, i) => ({
      combo_id: comboId,
      comercio_tipo: it.comercio_tipo,
      comercio_id: it.comercio_id,
      beneficio: it.beneficio,
      orden: i,
    })) as never
  );
}

function comboBaseFields(parsed: ComboInput, destinoId: string) {
  return {
    destino_id: destinoId,
    titulo: parsed.titulo,
    bajada: parsed.bajada ?? null,
    noches: parsed.noches,
    precio_desde: parsed.precio_desde ?? null,
    ahorro_pct: parsed.ahorro_pct ?? null,
    beneficios: parsed.beneficios,
    validez: parsed.validez ?? null,
  };
}

function makeSlug(titulo: string): string {
  return `${slugify(titulo)}-${Math.random().toString(36).slice(2, 6)}`;
}

// =============================================================================
// Responsable (arma → pendiente_validacion)
// =============================================================================

export async function createComboAsResponsableAction(
  fd: FormData
): Promise<ActionResult> {
  const resp = await requireResponsable();
  const parsed = comboSchema.safeParse(parseFormDataToCombo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const der = await deriveDestino(parsed.data.items);
  if ("error" in der) return { error: der.error };

  const misDestinos = await getResponsableDestinoIds(resp.id);
  if (!misDestinos.includes(der.destinoId)) {
    return { error: "Solo podés armar combos en destinos donde tenés comercios." };
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("combos")
    .insert({
      ...comboBaseFields(parsed.data, der.destinoId),
      slug: makeSlug(parsed.data.titulo),
      estado: "pendiente_validacion",
      creado_por: resp.id,
    } as never)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el combo." };

  await writeItems(data.id, parsed.data.items);
  revalidateCombos();
  return { ok: true, id: data.id };
}

export async function updateComboAsResponsableAction(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  const resp = await requireResponsable();
  const existing = await getComboById(id);
  if (!existing) return { error: "Combo no encontrado." };
  if (existing.combo.creado_por !== resp.id) {
    return { error: "No tenés permiso para editar este combo." };
  }

  const parsed = comboSchema.safeParse(parseFormDataToCombo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const der = await deriveDestino(parsed.data.items);
  if ("error" in der) return { error: der.error };
  const misDestinos = await getResponsableDestinoIds(resp.id);
  if (!misDestinos.includes(der.destinoId)) {
    return { error: "Solo podés armar combos en destinos donde tenés comercios." };
  }

  // Editar reenvía a validación.
  const nuevoEstado: EstadoCombo =
    existing.combo.estado === "publicado" ? "pendiente_validacion" : existing.combo.estado;

  const sb = createAdminClient();
  const { error } = await sb
    .from("combos")
    .update({
      ...comboBaseFields(parsed.data, der.destinoId),
      estado: nuevoEstado,
    } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  await writeItems(id, parsed.data.items);
  revalidateCombos();
  return { ok: true, id };
}

export async function deleteComboAsResponsableAction(id: string): Promise<ActionResult> {
  const resp = await requireResponsable();
  const existing = await getComboById(id);
  if (!existing) return { error: "Combo no encontrado." };
  if (existing.combo.creado_por !== resp.id) {
    return { error: "No tenés permiso para borrar este combo." };
  }
  const sb = createAdminClient();
  const { error } = await sb.from("combos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateCombos();
  return { ok: true };
}

// =============================================================================
// Admin (crea / edita / aprueba)
// =============================================================================

export async function createComboAsAdminAction(fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = comboSchema.safeParse(parseFormDataToCombo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const der = await deriveDestino(parsed.data.items);
  if ("error" in der) return { error: der.error };
  assertAdminCanAccessDestino(admin, der.destinoId);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("combos")
    .insert({
      ...comboBaseFields(parsed.data, der.destinoId),
      slug: makeSlug(parsed.data.titulo),
      estado: "borrador",
      creado_por: admin.id,
    } as never)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el combo." };

  await writeItems(data.id, parsed.data.items);
  revalidateCombos();
  return { ok: true, id: data.id };
}

export async function updateComboAsAdminAction(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const existing = await getComboById(id);
  if (!existing) return { error: "Combo no encontrado." };
  assertAdminCanAccessDestino(admin, existing.combo.destino_id);

  const parsed = comboSchema.safeParse(parseFormDataToCombo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const der = await deriveDestino(parsed.data.items);
  if ("error" in der) return { error: der.error };
  assertAdminCanAccessDestino(admin, der.destinoId);

  const sb = createAdminClient();
  const { error } = await sb
    .from("combos")
    .update(comboBaseFields(parsed.data, der.destinoId) as never)
    .eq("id", id);
  if (error) return { error: error.message };

  await writeItems(id, parsed.data.items);
  revalidateCombos();
  return { ok: true, id };
}

const changeEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum([
    "borrador",
    "pendiente_validacion",
    "publicado",
    "pausado",
    "rechazado",
  ]),
  motivo: z.string().max(500).optional(),
});

/** Solo admin. Cambia el estado del combo y notifica al creador en publicado/rechazado. */
export async function changeEstadoComboAction(input: {
  id: string;
  estado: EstadoCombo;
  motivo?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = changeEstadoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const existing = await getComboById(parsed.data.id);
  if (!existing) return { error: "Combo no encontrado." };
  assertAdminCanAccessDestino(admin, existing.combo.destino_id);

  const sb = createAdminClient();
  const { error } = await sb
    .from("combos")
    .update({ estado: parsed.data.estado } as never)
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };

  if (parsed.data.estado === "publicado") {
    await notifyComboPublicado(parsed.data.id);
  } else if (parsed.data.estado === "rechazado") {
    await notifyComboRechazado(
      parsed.data.id,
      parsed.data.motivo ?? "Revisá los datos del combo y volvé a enviarlo."
    );
  }

  revalidateCombos();
  return { ok: true, id: parsed.data.id };
}

export async function deleteComboAsAdminAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const existing = await getComboById(id);
  if (!existing) return { error: "Combo no encontrado." };
  assertAdminCanAccessDestino(admin, existing.combo.destino_id);
  const sb = createAdminClient();
  const { error } = await sb.from("combos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateCombos();
  return { ok: true };
}
