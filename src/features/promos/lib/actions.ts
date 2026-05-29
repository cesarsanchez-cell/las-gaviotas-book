"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { requireResponsable } from "@/features/panel/lib/auth";
import { assertAdminCanAccessDestino } from "@/features/admin/lib/scope";
import { promoSchema, parseFormDataToPromo } from "./promo-schema";
import { getComercioRef, getPromoById } from "./queries";
import type { ComercioTipo } from "@/types/database";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "comercio";
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

function revalidatePromos() {
  revalidatePath("/admin/promos");
  revalidatePath("/panel");
  revalidatePath("/");
}

/** Comprueba que el responsable sea dueño del comercio (hospedaje o lugar). */
function responsableOwnsComercio(
  responsable: { hospedajeIds: string[]; lugarIds: string[] },
  tipo: ComercioTipo,
  comercioId: string
): boolean {
  return tipo === "hospedaje"
    ? responsable.hospedajeIds.includes(comercioId)
    : responsable.lugarIds.includes(comercioId);
}

// =============================================================================
// Admin
// =============================================================================

export async function createPromoAsAdminAction(
  fd: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = promoSchema.safeParse(parseFormDataToPromo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const ref = await getComercioRef(parsed.data.comercio_tipo, parsed.data.comercio_id);
  if (!ref) return { error: "El comercio seleccionado no existe." };
  assertAdminCanAccessDestino(admin, ref.destinoId);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promos")
    .insert({
      destino_id: ref.destinoId,
      comercio_tipo: parsed.data.comercio_tipo,
      comercio_id: parsed.data.comercio_id,
      titulo: parsed.data.titulo,
      bajada: parsed.data.bajada ?? null,
      beneficio: parsed.data.beneficio,
      pct: parsed.data.pct ?? null,
      vigencia_desde: parsed.data.vigencia_desde ?? null,
      vigencia_hasta: parsed.data.vigencia_hasta ?? null,
      activo: parsed.data.activo,
    } as never)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true, id: data?.id };
}

export async function updatePromoAsAdminAction(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const promo = await getPromoById(id);
  if (!promo) return { error: "Promo no encontrada." };
  assertAdminCanAccessDestino(admin, promo.destino_id);

  const parsed = promoSchema.safeParse(parseFormDataToPromo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  const ref = await getComercioRef(parsed.data.comercio_tipo, parsed.data.comercio_id);
  if (!ref) return { error: "El comercio seleccionado no existe." };
  assertAdminCanAccessDestino(admin, ref.destinoId);

  const sb = createAdminClient();
  const { error } = await sb
    .from("promos")
    .update({
      destino_id: ref.destinoId,
      comercio_tipo: parsed.data.comercio_tipo,
      comercio_id: parsed.data.comercio_id,
      titulo: parsed.data.titulo,
      bajada: parsed.data.bajada ?? null,
      beneficio: parsed.data.beneficio,
      pct: parsed.data.pct ?? null,
      vigencia_desde: parsed.data.vigencia_desde ?? null,
      vigencia_hasta: parsed.data.vigencia_hasta ?? null,
      activo: parsed.data.activo,
    } as never)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true, id };
}

export async function deletePromoAsAdminAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const promo = await getPromoById(id);
  if (!promo) return { error: "Promo no encontrada." };
  assertAdminCanAccessDestino(admin, promo.destino_id);

  const sb = createAdminClient();
  const { error } = await sb.from("promos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true };
}

// =============================================================================
// Responsable
// =============================================================================

export async function createPromoAsResponsableAction(
  fd: FormData
): Promise<ActionResult> {
  const resp = await requireResponsable();
  const parsed = promoSchema.safeParse(parseFormDataToPromo(fd));
  if (!parsed.success) return formatZodError(parsed.error);

  if (!responsableOwnsComercio(resp, parsed.data.comercio_tipo, parsed.data.comercio_id)) {
    return { error: "No tenés permiso para crear promos en ese comercio." };
  }
  const ref = await getComercioRef(parsed.data.comercio_tipo, parsed.data.comercio_id);
  if (!ref) return { error: "El comercio seleccionado no existe." };

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("promos")
    .insert({
      destino_id: ref.destinoId,
      comercio_tipo: parsed.data.comercio_tipo,
      comercio_id: parsed.data.comercio_id,
      titulo: parsed.data.titulo,
      bajada: parsed.data.bajada ?? null,
      beneficio: parsed.data.beneficio,
      pct: parsed.data.pct ?? null,
      vigencia_desde: parsed.data.vigencia_desde ?? null,
      vigencia_hasta: parsed.data.vigencia_hasta ?? null,
      activo: parsed.data.activo,
    } as never)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true, id: data?.id };
}

export async function updatePromoAsResponsableAction(
  id: string,
  fd: FormData
): Promise<ActionResult> {
  const resp = await requireResponsable();
  const promo = await getPromoById(id);
  if (!promo) return { error: "Promo no encontrada." };
  if (!responsableOwnsComercio(resp, promo.comercio_tipo, promo.comercio_id)) {
    return { error: "No tenés permiso para editar esta promo." };
  }

  const parsed = promoSchema.safeParse(parseFormDataToPromo(fd));
  if (!parsed.success) return formatZodError(parsed.error);
  if (!responsableOwnsComercio(resp, parsed.data.comercio_tipo, parsed.data.comercio_id)) {
    return { error: "No tenés permiso sobre el comercio elegido." };
  }
  const ref = await getComercioRef(parsed.data.comercio_tipo, parsed.data.comercio_id);
  if (!ref) return { error: "El comercio seleccionado no existe." };

  const sb = createAdminClient();
  const { error } = await sb
    .from("promos")
    .update({
      destino_id: ref.destinoId,
      comercio_tipo: parsed.data.comercio_tipo,
      comercio_id: parsed.data.comercio_id,
      titulo: parsed.data.titulo,
      bajada: parsed.data.bajada ?? null,
      beneficio: parsed.data.beneficio,
      pct: parsed.data.pct ?? null,
      vigencia_desde: parsed.data.vigencia_desde ?? null,
      vigencia_hasta: parsed.data.vigencia_hasta ?? null,
      activo: parsed.data.activo,
    } as never)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true, id };
}

export async function deletePromoAsResponsableAction(
  id: string
): Promise<ActionResult> {
  const resp = await requireResponsable();
  const promo = await getPromoById(id);
  if (!promo) return { error: "Promo no encontrada." };
  if (!responsableOwnsComercio(resp, promo.comercio_tipo, promo.comercio_id)) {
    return { error: "No tenés permiso para borrar esta promo." };
  }
  const sb = createAdminClient();
  const { error } = await sb.from("promos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePromos();
  return { ok: true };
}
