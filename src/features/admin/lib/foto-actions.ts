"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PerfilRow } from "@/types/database";

/**
 * Garantiza que el usuario actual puede gestionar fotos del hospedaje dado.
 *
 * Permite:
 * - super admin (destino_id=null): cualquier hospedaje
 * - admin local (destino_id=<uuid>): solo hospedajes de su destino
 * - responsable: solo hospedajes que gestiona (vía `responsabilidades`)
 */
async function requireAccessToHospedaje(hospedajeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<PerfilRow>();
  if (!perfil) throw new Error("Sin perfil");

  if (perfil.rol === "admin") {
    if (perfil.destino_id === null) return { user, perfil };
    // Admin local: chequear que el hospedaje sea de su destino.
    const sb = createAdminClient();
    const { data: h } = await sb
      .from("hospedajes")
      .select("destino_id")
      .eq("id", hospedajeId)
      .maybeSingle<{ destino_id: string }>();
    if (!h) throw new Error("Hospedaje no encontrado");
    if (h.destino_id !== perfil.destino_id) {
      throw new Error("Sin permisos sobre este hospedaje");
    }
    return { user, perfil };
  }
  if (perfil.rol === "responsable") {
    // Ownership vía `responsabilidades` (fuente de verdad), no por el array
    // legacy `perfiles.hospedajes_ids[]`. La policy "lectura propia" permite
    // al usuario leer sus propias filas con el cliente RLS.
    const { data: resp } = await supabase
      .from("responsabilidades")
      .select("entidad_id")
      .eq("perfil_id", user.id)
      .eq("entidad_tipo", "hospedaje")
      .eq("entidad_id", hospedajeId)
      .maybeSingle<{ entidad_id: string }>();
    if (resp) return { user, perfil };
  }
  throw new Error("Sin permisos sobre este hospedaje");
}

const insertFotoSchema = z.object({
  hospedaje_id: z.string().uuid(),
  storage_path: z.string().min(1),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export async function registerFotoAction(input: z.infer<typeof insertFotoSchema>) {
  const parsed = insertFotoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };
  try {
    await requireAccessToHospedaje(parsed.data.hospedaje_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Atar el storage_path a la entidad autorizada (convención `<hospedajeId>/…`).
  // Sin esto, un caller con acceso a SU hospedaje podría registrar una fila que
  // apunta al blob de OTRO y luego borrarlo vía deleteFotoAction (service role
  // saltea la policy de Storage). Ver auditoría Etapa 4 (F-S2).
  if (!parsed.data.storage_path.startsWith(`${parsed.data.hospedaje_id}/`)) {
    return { error: "Ruta de archivo inválida." };
  }

  // Service role para evitar problemas de RLS — ya validamos sesión arriba.
  const admin = createAdminClient();

  // Calcular orden = max + 1
  const { data: maxOrden } = await admin
    .from("hospedaje_fotos")
    .select("orden")
    .eq("hospedaje_id", parsed.data.hospedaje_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();

  const nextOrden = (maxOrden?.orden ?? -1) + 1;

  // Si no hay fotos previas, esta es la principal
  const { count } = await admin
    .from("hospedaje_fotos")
    .select("id", { count: "exact", head: true })
    .eq("hospedaje_id", parsed.data.hospedaje_id);

  const esPrincipal = (count ?? 0) === 0;

  const insertPayload = {
    ...parsed.data,
    orden: nextOrden,
    es_principal: esPrincipal,
  };
  const { error } = await admin
    .from("hospedaje_fotos")
    .insert(insertPayload as never);

  if (error) return { error: error.message };

  revalidatePath(`/admin/hospedajes/${parsed.data.hospedaje_id}`);
  return { ok: true };
}

const MIN_FOTOS_PUBLICADO = 1;

export async function deleteFotoAction(input: {
  fotoId: string;
  hospedajeId: string;
  storagePath: string;
}) {
  try {
    await requireAccessToHospedaje(input.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = createAdminClient();

  // Scope obligatorio: la foto tiene que pertenecer a ESTE hospedaje. Como
  // usamos service role (sin RLS), sin este chequeo un caller con acceso a un
  // hospedaje propio podría borrar una foto de otro pasando un fotoId ajeno.
  // Además tomamos el storage_path desde la BD — nunca del input del cliente.
  const { data: foto } = await admin
    .from("hospedaje_fotos")
    .select("storage_path")
    .eq("id", input.fotoId)
    .eq("hospedaje_id", input.hospedajeId)
    .maybeSingle<{ storage_path: string }>();
  if (!foto) return { error: "La foto no pertenece a este hospedaje." };

  // Si el hospedaje está publicado, no permitir el borrado si dejaría
  // al hospedaje con menos de 5 fotos en alta resolución. El responsable
  // (o admin) debe pausar primero o subir un reemplazo de buena calidad.
  const { data: hospedaje } = await admin
    .from("hospedajes")
    .select("estado")
    .eq("id", input.hospedajeId)
    .maybeSingle<{ estado: string }>();

  if (hospedaje?.estado === "publicado") {
    const { data: fotos } = await admin
      .from("hospedaje_fotos")
      .select("id")
      .eq("hospedaje_id", input.hospedajeId)
      .returns<{ id: string }[]>();

    const remainingFotos = (fotos ?? []).filter(
      (f) => f.id !== input.fotoId
    ).length;

    if (remainingFotos < MIN_FOTOS_PUBLICADO) {
      return {
        error: `No podés borrar esta foto: el hospedaje quedaría sin fotos. Subí un reemplazo primero, o pausá el hospedaje antes de borrar.`,
      };
    }
  }

  await admin.storage.from("hospedajes").remove([foto.storage_path]);

  const { error } = await admin
    .from("hospedaje_fotos")
    .delete()
    .eq("id", input.fotoId)
    .eq("hospedaje_id", input.hospedajeId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  revalidatePath(`/panel/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}

export async function setPrincipalAction(input: {
  fotoId: string;
  hospedajeId: string;
}) {
  try {
    await requireAccessToHospedaje(input.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = createAdminClient();

  const { error: e1 } = await admin
    .from("hospedaje_fotos")
    .update({ es_principal: false } as never)
    .eq("hospedaje_id", input.hospedajeId);
  if (e1) return { error: e1.message };

  const { error: e2 } = await admin
    .from("hospedaje_fotos")
    .update({ es_principal: true } as never)
    .eq("id", input.fotoId)
    .eq("hospedaje_id", input.hospedajeId);
  if (e2) return { error: e2.message };

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  revalidatePath(`/panel/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}

export async function updateFotoOrderAction(input: {
  hospedajeId: string;
  orderedIds: string[];
}) {
  try {
    await requireAccessToHospedaje(input.hospedajeId);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = createAdminClient();

  await Promise.all(
    input.orderedIds.map((id, i) =>
      admin
        .from("hospedaje_fotos")
        .update({ orden: i } as never)
        .eq("id", id)
        .eq("hospedaje_id", input.hospedajeId)
    )
  );

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  revalidatePath(`/panel/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}
