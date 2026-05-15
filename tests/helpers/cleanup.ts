import { createClient } from "@supabase/supabase-js";

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no seteadas");
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Borra hospedajes cuyo slug arranca con un prefijo dado (test data). */
export async function cleanupTestHospedajes(slugPrefix: string) {
  const admin = getAdminClient();

  const { data: hospedajes } = await admin
    .from("hospedajes")
    .select("id")
    .like("slug", `${slugPrefix}%`);

  if (!hospedajes?.length) return;

  for (const h of hospedajes) {
    // Borrar fotos del storage (los rows en hospedaje_fotos se borran por cascade)
    const { data: fotos } = await admin
      .from("hospedaje_fotos")
      .select("storage_path")
      .eq("hospedaje_id", h.id);

    if (fotos?.length) {
      await admin.storage.from("hospedajes").remove(fotos.map((f) => f.storage_path));
    }

    await admin.from("hospedajes").delete().eq("id", h.id);
  }
}

/** Borra el hospedaje del perfil responsable testing y resetea hospedajes_ids. */
export async function resetResponsableHospedajes(email: string) {
  const admin = getAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return;
  await admin
    .from("perfiles")
    .update({ hospedajes_ids: [] })
    .eq("id", user.id);
}

const LAS_GAVIOTAS_DESTINO_ID = "11111111-1111-1111-1111-111111111111";

/**
 * Crea un hospedaje en borrador (server-side, service role) y lo asocia al
 * perfil del email indicado. Devuelve el id del hospedaje. Útil para tests
 * que necesitan estado pre-existente sin pasar por la UI.
 */
export async function seedHospedajeAsResponsable(
  email: string,
  slug: string,
  nombre: string,
  estado: "borrador" | "pendiente_validacion" | "publicado" | "pausado" | "rechazado" = "borrador"
): Promise<string> {
  const admin = getAdminClient();

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Usuario ${email} no encontrado`);

  const { data: hospedaje, error } = await admin
    .from("hospedajes")
    .insert({
      destino_id: LAS_GAVIOTAS_DESTINO_ID,
      slug,
      nombre,
      tipo: "cabana",
      descripcion_corta: "Hospedaje de testing seedeado server-side.",
      direccion: "Calle 1 entre 1 y 1",
      whatsapp: "+5492257000000",
      responsable_nombre: "Tester Seed",
      estado,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !hospedaje) {
    throw new Error(`Insert seed hospedaje failed: ${error?.message}`);
  }

  const { data: perfil } = await admin
    .from("perfiles")
    .select("hospedajes_ids")
    .eq("id", user.id)
    .single<{ hospedajes_ids: string[] | null }>();

  const nuevosIds = Array.from(
    new Set([...(perfil?.hospedajes_ids ?? []), hospedaje.id])
  );

  await admin
    .from("perfiles")
    .update({ hospedajes_ids: nuevosIds } as never)
    .eq("id", user.id);

  return hospedaje.id;
}

/**
 * Crea N rows en hospedaje_fotos via service role con storage_path falso.
 * No sube archivos reales — sirve para tests donde sólo importa el row
 * en DB (counters, RLS, etc.).
 */
export async function seedFotosForHospedaje(
  hospedajeId: string,
  count: number,
  width = 1600,
  height = 1200
): Promise<void> {
  const admin = getAdminClient();
  const rows = Array.from({ length: count }).map((_, i) => ({
    hospedaje_id: hospedajeId,
    storage_path: `test-fake/${hospedajeId}/foto-${i}-${Date.now()}.jpg`,
    width,
    height,
    orden: i,
    es_principal: i === 0,
  }));
  const { error } = await admin.from("hospedaje_fotos").insert(rows as never);
  if (error) throw new Error(`seedFotos failed: ${error.message}`);
}
