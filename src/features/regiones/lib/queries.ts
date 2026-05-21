import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Bioma, RegionRow } from "@/types/database";

export interface RegionWithCount extends RegionRow {
  destinos_count: number;
}

/**
 * Lista regiones activas para la home pública. Ordenadas por `orden` y trae
 * el count de destinos publicados por región para mostrar en la card.
 */
export async function listRegionesPublicas(): Promise<RegionWithCount[]> {
  const sb = await createClient();
  const { data: regiones } = await sb
    .from("regiones")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .returns<RegionRow[]>();
  if (!regiones || regiones.length === 0) return [];

  // Contamos destinos activos por región en una sola query.
  const { data: destinos } = (await sb
    .from("destinos")
    .select("region_id")
    .eq("activo", true)
    .not("region_id", "is", null)) as {
    data: Array<{ region_id: string | null }> | null;
  };

  const counts = new Map<string, number>();
  for (const d of destinos ?? []) {
    if (!d.region_id) continue;
    counts.set(d.region_id, (counts.get(d.region_id) ?? 0) + 1);
  }
  return regiones.map((r) => ({
    ...r,
    destinos_count: counts.get(r.id) ?? 0,
  }));
}

/**
 * Lista TODAS las regiones (incluso inactivas) para el panel admin. Solo
 * llamar desde server actions que ya verificaron permisos de super admin.
 */
export async function listRegionesAdmin(): Promise<RegionWithCount[]> {
  const sb = createAdminClient();
  const { data: regiones } = await sb
    .from("regiones")
    .select("*")
    .order("orden", { ascending: true })
    .returns<RegionRow[]>();
  if (!regiones) return [];

  const { data: destinos } = (await sb
    .from("destinos")
    .select("region_id")
    .not("region_id", "is", null)) as {
    data: Array<{ region_id: string | null }> | null;
  };
  const counts = new Map<string, number>();
  for (const d of destinos ?? []) {
    if (!d.region_id) continue;
    counts.set(d.region_id, (counts.get(d.region_id) ?? 0) + 1);
  }
  return regiones.map((r) => ({
    ...r,
    destinos_count: counts.get(r.id) ?? 0,
  }));
}

export async function getRegionBySlug(
  slug: string
): Promise<RegionRow | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("regiones")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<RegionRow>();
  return data ?? null;
}

export async function getRegionById(id: string): Promise<RegionRow | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("regiones")
    .select("*")
    .eq("id", id)
    .maybeSingle<RegionRow>();
  return data ?? null;
}

/** Lista destinos de una región (activos), ordenados. */
export async function listDestinosDeRegion(regionId: string) {
  const sb = await createClient();
  const { data } = await sb
    .from("destinos")
    .select("*")
    .eq("region_id", regionId)
    .eq("activo", true)
    .order("orden", { ascending: true });
  return data ?? [];
}

/**
 * Helper de tipo: convierte el array `biomas` de Postgres (string[]) al tipo
 * `Bioma[]` tras filtrar valores inválidos. Defensivo por si la BD recibe un
 * valor fuera del set canónico.
 */
const BIOMAS_VALIDOS: ReadonlySet<Bioma> = new Set([
  "playa",
  "bosque",
  "montana",
  "sierra",
  "lago",
  "desierto",
]);

export function sanitizeBiomas(raw: unknown): Bioma[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (b): b is Bioma => typeof b === "string" && BIOMAS_VALIDOS.has(b as Bioma)
  );
}
