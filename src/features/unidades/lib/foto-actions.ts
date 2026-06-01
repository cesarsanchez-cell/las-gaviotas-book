"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentResponsable } from "@/features/panel/lib/auth";

/**
 * Verifica que el usuario actual sea el responsable dueño del hospedaje al
 * que pertenece este unidad_type. Coherente con el resto de actions del
 * feature unidades: el responsable es el único que toca su inventario.
 *
 * Devuelve `{ hospedajeId, unidadTypeId }` para que el caller pueda
 * revalidar rutas sin tener que volver a leer la BD.
 */
async function requireResponsableOwnsUnidadType(
  unidadTypeId: string
): Promise<{ hospedajeId: string; unidadTypeId: string; userId: string }> {
  const responsable = await getCurrentResponsable();
  if (!responsable || responsable.perfil.rol !== "responsable") {
    throw new Error(
      "Solo el responsable del hospedaje puede modificar las fotos."
    );
  }
  const sb = createAdminClient();
  const { data } = await sb
    .from("unidad_types")
    .select("hospedaje_id")
    .eq("id", unidadTypeId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!data) throw new Error("Tipo de unidad inexistente.");
  if (!responsable.hospedajeIds.includes(data.hospedaje_id)) {
    throw new Error("Sin permisos sobre este hospedaje.");
  }
  return {
    hospedajeId: data.hospedaje_id,
    unidadTypeId,
    userId: responsable.id,
  };
}

function revalidate(hospedajeId: string) {
  revalidatePath(`/panel/hospedajes/${hospedajeId}/unidades`);
  revalidatePath(`/panel/hospedajes/${hospedajeId}`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}/unidades`);
}

const insertSchema = z.object({
  unidad_type_id: z.string().uuid(),
  storage_path: z.string().min(1),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * Registra una foto ya subida al bucket. Calcula orden = max+1.
 * Si es la primera foto, queda marcada como principal automáticamente.
 */
export async function registerUnidadTypeFotoAction(
  input: z.infer<typeof insertSchema>
) {
  const parsed = insertSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidadType(parsed.data.unidad_type_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  const { data: maxOrden } = await sb
    .from("unidad_type_fotos")
    .select("orden")
    .eq("unidad_type_id", parsed.data.unidad_type_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();

  const nextOrden = (maxOrden?.orden ?? -1) + 1;

  const { count } = await sb
    .from("unidad_type_fotos")
    .select("id", { count: "exact", head: true })
    .eq("unidad_type_id", parsed.data.unidad_type_id);

  const esPrincipal = (count ?? 0) === 0;

  const { error } = await sb.from("unidad_type_fotos").insert({
    unidad_type_id: parsed.data.unidad_type_id,
    storage_path: parsed.data.storage_path,
    alt: parsed.data.alt ?? null,
    width: parsed.data.width,
    height: parsed.data.height,
    orden: nextOrden,
    es_principal: esPrincipal,
  } as never);

  if (error) return { error: error.message };

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

export async function deleteUnidadTypeFotoAction(input: {
  fotoId: string;
  unidadTypeId: string;
  storagePath: string;
}) {
  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidadType(input.unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const sb = createAdminClient();

  // Scope obligatorio: la foto tiene que pertenecer a ESTE tipo de unidad.
  // Con service role (sin RLS) un fotoId ajeno se borraría igual sin este
  // filtro. Tomamos storage_path desde la BD, no del input del cliente.
  const { data: foto } = await sb
    .from("unidad_type_fotos")
    .select("es_principal, storage_path")
    .eq("id", input.fotoId)
    .eq("unidad_type_id", input.unidadTypeId)
    .maybeSingle<{ es_principal: boolean; storage_path: string }>();
  if (!foto) return { error: "La foto no pertenece a esta unidad." };

  // Borrado del blob — fallback silencioso si falla (puede ser que no exista).
  await sb.storage.from("hospedajes").remove([foto.storage_path]);

  const { error } = await sb
    .from("unidad_type_fotos")
    .delete()
    .eq("id", input.fotoId)
    .eq("unidad_type_id", input.unidadTypeId);
  if (error) return { error: error.message };

  if (foto?.es_principal) {
    const { data: next } = await sb
      .from("unidad_type_fotos")
      .select("id")
      .eq("unidad_type_id", input.unidadTypeId)
      .order("orden", { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (next) {
      await sb
        .from("unidad_type_fotos")
        .update({ es_principal: true } as never)
        .eq("id", next.id);
    }
  }

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

export async function setUnidadTypeFotoPrincipalAction(input: {
  fotoId: string;
  unidadTypeId: string;
}) {
  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidadType(input.unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const sb = createAdminClient();

  // Hay un unique index parcial (es_principal=true) por unidad_type_id.
  // Tenemos que quitar primero el viejo principal y después marcar el nuevo,
  // sino el insert/update violaría la restricción.
  const { error: e1 } = await sb
    .from("unidad_type_fotos")
    .update({ es_principal: false } as never)
    .eq("unidad_type_id", input.unidadTypeId);
  if (e1) return { error: e1.message };

  const { error: e2 } = await sb
    .from("unidad_type_fotos")
    .update({ es_principal: true } as never)
    .eq("id", input.fotoId)
    .eq("unidad_type_id", input.unidadTypeId);
  if (e2) return { error: e2.message };

  revalidate(ctx.hospedajeId);
  return { ok: true };
}

const updateAltSchema = z.object({
  fotoId: z.string().uuid(),
  unidadTypeId: z.string().uuid(),
  alt: z.string().trim().max(200),
});

export async function updateUnidadTypeFotoAltAction(input: {
  fotoId: string;
  unidadTypeId: string;
  alt: string;
}) {
  const parsed = updateAltSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await requireResponsableOwnsUnidadType(parsed.data.unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("unidad_type_fotos")
    .update({ alt: parsed.data.alt || null } as never)
    .eq("id", parsed.data.fotoId)
    .eq("unidad_type_id", parsed.data.unidadTypeId);
  if (error) return { error: error.message };

  revalidate(ctx.hospedajeId);
  return { ok: true };
}
