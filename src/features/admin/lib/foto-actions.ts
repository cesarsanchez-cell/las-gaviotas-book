"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";

const insertFotoSchema = z.object({
  hospedaje_id: z.string().uuid(),
  storage_path: z.string().min(1),
  alt: z.string().max(200).optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export async function registerFotoAction(input: z.infer<typeof insertFotoSchema>) {
  await requireAdmin();
  const parsed = insertFotoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const supabase = await createClient();

  // Calcular orden = max + 1
  const { data: maxOrden } = await supabase
    .from("hospedaje_fotos")
    .select("orden")
    .eq("hospedaje_id", parsed.data.hospedaje_id)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle<{ orden: number }>();

  const nextOrden = (maxOrden?.orden ?? -1) + 1;

  // Si no hay fotos previas, esta es la principal
  const { count } = await supabase
    .from("hospedaje_fotos")
    .select("id", { count: "exact", head: true })
    .eq("hospedaje_id", parsed.data.hospedaje_id);

  const esPrincipal = (count ?? 0) === 0;

  const insertPayload = {
    ...parsed.data,
    orden: nextOrden,
    es_principal: esPrincipal,
  };
  const { error } = await supabase
    .from("hospedaje_fotos")
    // Cast hasta regenerar tipos con `supabase gen types`
    .insert(insertPayload as never);

  if (error) return { error: error.message };

  revalidatePath(`/admin/hospedajes/${parsed.data.hospedaje_id}`);
  return { ok: true };
}

export async function deleteFotoAction(input: {
  fotoId: string;
  hospedajeId: string;
  storagePath: string;
}) {
  await requireAdmin();

  const supabase = await createClient();
  const admin = createAdminClient();

  // Borrar de storage (service role bypassea RLS)
  await admin.storage.from("hospedajes").remove([input.storagePath]);

  const { error } = await supabase
    .from("hospedaje_fotos")
    .delete()
    .eq("id", input.fotoId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}

export async function setPrincipalAction(input: {
  fotoId: string;
  hospedajeId: string;
}) {
  await requireAdmin();
  const supabase = await createClient();

  // Quitar principal a todas
  const { error: e1 } = await supabase
    .from("hospedaje_fotos")
    .update({ es_principal: false } as never)
    .eq("hospedaje_id", input.hospedajeId);
  if (e1) return { error: e1.message };

  // Marcar la nueva
  const { error: e2 } = await supabase
    .from("hospedaje_fotos")
    .update({ es_principal: true } as never)
    .eq("id", input.fotoId);
  if (e2) return { error: e2.message };

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}

export async function updateFotoOrderAction(input: {
  hospedajeId: string;
  orderedIds: string[];
}) {
  await requireAdmin();
  const supabase = await createClient();

  await Promise.all(
    input.orderedIds.map((id, i) =>
      supabase
        .from("hospedaje_fotos")
        .update({ orden: i } as never)
        .eq("id", id)
    )
  );

  revalidatePath(`/admin/hospedajes/${input.hospedajeId}`);
  return { ok: true };
}
