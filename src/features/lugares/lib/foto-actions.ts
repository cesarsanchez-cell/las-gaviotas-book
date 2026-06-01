"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { getCurrentResponsable } from "@/features/panel/lib/auth";

/**
 * Helper unificado: el usuario actual ¿puede gestionar fotos de este lugar?
 *
 * Caminos válidos:
 *   - Admin (super o del destino del lugar) → siempre, cualquier tipo.
 *   - Responsable → solo si está en `responsabilidades` para este lugar
 *     (que la BD garantiza que sea de tipo gastronómico vía el INSERT que
 *     hizo `createLugarAsResponsableAction`).
 *
 * Devuelve `{ lugarId, destinoId }` para revalidar paths sin re-consultar.
 */
async function requireCanManageLugarFotos(
  lugarId: string
): Promise<{ lugarId: string; destinoId: string }> {
  const sb = createAdminClient();
  const { data: lugar } = await sb
    .from("lugares")
    .select("destino_id, tipo")
    .eq("id", lugarId)
    .maybeSingle<{ destino_id: string; tipo: string }>();
  if (!lugar) throw new Error("Lugar no encontrado.");

  const admin = await getCurrentAdmin();
  if (admin) {
    if (admin.isSuperAdmin || admin.destinoId === lugar.destino_id) {
      return { lugarId, destinoId: lugar.destino_id };
    }
    throw new Error("Sin permiso para este destino.");
  }

  const responsable = await getCurrentResponsable();
  if (!responsable || responsable.perfil.rol !== "responsable") {
    throw new Error("Tenés que estar logueado para gestionar fotos.");
  }
  const { data: resp } = await sb
    .from("responsabilidades")
    .select("id")
    .eq("perfil_id", responsable.id)
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", lugarId)
    .maybeSingle<{ id: string }>();
  if (!resp) throw new Error("Sin permisos sobre este lugar.");

  return { lugarId, destinoId: lugar.destino_id };
}

function revalidate(lugarId: string) {
  revalidatePath(`/admin/lugares/${lugarId}`);
  revalidatePath(`/admin/lugares`);
  revalidatePath(`/panel/lugares/${lugarId}`);
  revalidatePath(`/panel/lugares`);
}

// =============================================================================
// REGISTER (foto ya subida al bucket, anotamos metadata en la BD)
// =============================================================================

const insertSchema = z.object({
  lugar_id: z.string().uuid(),
  storage_path: z.string().min(1),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export async function registerLugarFotoAction(
  input: z.infer<typeof insertSchema>
) {
  const parsed = insertSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireCanManageLugarFotos(parsed.data.lugar_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  // orden = max+1
  const { data: maxOrden } = await sb
    .from("lugar_fotos")
    .select("orden")
    .eq("lugar_id", parsed.data.lugar_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();

  const nextOrden = (maxOrden?.orden ?? -1) + 1;

  // ¿Es la primera? Entonces queda como principal automáticamente.
  const { count } = await sb
    .from("lugar_fotos")
    .select("id", { count: "exact", head: true })
    .eq("lugar_id", parsed.data.lugar_id);

  const esPrincipal = (count ?? 0) === 0;

  const { error } = await sb.from("lugar_fotos").insert({
    lugar_id: parsed.data.lugar_id,
    storage_path: parsed.data.storage_path,
    alt: parsed.data.alt ?? null,
    width: parsed.data.width,
    height: parsed.data.height,
    orden: nextOrden,
    es_principal: esPrincipal,
  } as never);

  if (error) return { error: error.message };

  revalidate(ctx.lugarId);
  return { ok: true };
}

// =============================================================================
// DELETE
// =============================================================================

export async function deleteLugarFotoAction(input: {
  fotoId: string;
  lugarId: string;
  storagePath: string;
}) {
  let ctx;
  try {
    ctx = await requireCanManageLugarFotos(input.lugarId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const sb = createAdminClient();

  // Scope obligatorio: la foto tiene que pertenecer a ESTE lugar. Con service
  // role (sin RLS) un fotoId ajeno se borraría igual sin este filtro. El
  // storage_path se toma de la BD, nunca del input del cliente.
  const { data: foto } = await sb
    .from("lugar_fotos")
    .select("es_principal, storage_path")
    .eq("id", input.fotoId)
    .eq("lugar_id", input.lugarId)
    .maybeSingle<{ es_principal: boolean; storage_path: string }>();
  if (!foto) return { error: "La foto no pertenece a este lugar." };

  // Borrado del blob — fallback silencioso si falla.
  await sb.storage.from("hospedajes").remove([foto.storage_path]);

  const { error } = await sb
    .from("lugar_fotos")
    .delete()
    .eq("id", input.fotoId)
    .eq("lugar_id", input.lugarId);
  if (error) return { error: error.message };

  if (foto?.es_principal) {
    const { data: next } = await sb
      .from("lugar_fotos")
      .select("id")
      .eq("lugar_id", input.lugarId)
      .order("orden", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (next) {
      await sb
        .from("lugar_fotos")
        .update({ es_principal: true } as never)
        .eq("id", next.id);
    }
  }

  revalidate(ctx.lugarId);
  return { ok: true };
}

// =============================================================================
// SET PRINCIPAL
// =============================================================================

export async function setLugarFotoPrincipalAction(input: {
  fotoId: string;
  lugarId: string;
}) {
  let ctx;
  try {
    ctx = await requireCanManageLugarFotos(input.lugarId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const sb = createAdminClient();

  // Hay un unique index parcial (es_principal=true) por lugar_id.
  // Quitamos primero el viejo principal y después marcamos el nuevo,
  // sino el update violaría la restricción.
  const { error: e1 } = await sb
    .from("lugar_fotos")
    .update({ es_principal: false } as never)
    .eq("lugar_id", input.lugarId);
  if (e1) return { error: e1.message };

  const { error: e2 } = await sb
    .from("lugar_fotos")
    .update({ es_principal: true } as never)
    .eq("id", input.fotoId)
    .eq("lugar_id", input.lugarId);
  if (e2) return { error: e2.message };

  revalidate(ctx.lugarId);
  return { ok: true };
}

// =============================================================================
// UPDATE ALT
// =============================================================================

const updateAltSchema = z.object({
  fotoId: z.string().uuid(),
  lugarId: z.string().uuid(),
  alt: z.string().trim().max(200),
});

export async function updateLugarFotoAltAction(input: {
  fotoId: string;
  lugarId: string;
  alt: string;
}) {
  const parsed = updateAltSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireCanManageLugarFotos(parsed.data.lugarId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("lugar_fotos")
    .update({ alt: parsed.data.alt || null } as never)
    .eq("id", parsed.data.fotoId)
    .eq("lugar_id", parsed.data.lugarId);
  if (error) return { error: error.message };

  revalidate(ctx.lugarId);
  return { ok: true };
}

// =============================================================================
// REORDER (drag&drop futuro — dejo el endpoint para no tocarlo dos veces)
// =============================================================================

const reorderSchema = z.object({
  lugarId: z.string().uuid(),
  ordenFotos: z.array(z.object({ fotoId: z.string().uuid(), orden: z.number().int().min(0) })),
});

export async function reorderLugarFotosAction(input: {
  lugarId: string;
  ordenFotos: { fotoId: string; orden: number }[];
}) {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireCanManageLugarFotos(parsed.data.lugarId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  for (const item of parsed.data.ordenFotos) {
    const { error } = await sb
      .from("lugar_fotos")
      .update({ orden: item.orden } as never)
      .eq("id", item.fotoId)
      .eq("lugar_id", parsed.data.lugarId);
    if (error) return { error: error.message };
  }

  revalidate(ctx.lugarId);
  return { ok: true };
}
