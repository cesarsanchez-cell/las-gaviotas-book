import { createClient } from "@/lib/supabase/server";
import type {
  EstadoHospedaje,
  HospedajeRow,
  HospedajeFotoRow,
} from "@/types/database";

export interface MyHospedajeRow {
  id: string;
  slug: string;
  nombre: string;
  tipo: HospedajeRow["tipo"];
  estado: EstadoHospedaje;
  destino_slug: string;
  destino_nombre: string;
  updated_at: string;
  foto_principal_path?: string;
}

export async function listMyHospedajes(
  hospedajesIds: string[]
): Promise<MyHospedajeRow[]> {
  if (hospedajesIds.length === 0) return [];
  const supabase = await createClient();

  const { data } = await supabase
    .from("hospedajes")
    .select(
      "id, slug, nombre, tipo, estado, updated_at, destinos!inner(slug, nombre), hospedaje_fotos(storage_path, es_principal, orden)"
    )
    .in("id", hospedajesIds)
    .order("updated_at", { ascending: false });

  return (
    (data as unknown as Array<{
      id: string;
      slug: string;
      nombre: string;
      tipo: HospedajeRow["tipo"];
      estado: EstadoHospedaje;
      updated_at: string;
      destinos: { slug: string; nombre: string };
      hospedaje_fotos: Array<Pick<HospedajeFotoRow, "storage_path" | "es_principal" | "orden">>;
    }>) ?? []
  ).map((h) => {
    const principal =
      h.hospedaje_fotos.find((f) => f.es_principal) ??
      h.hospedaje_fotos.sort((a, b) => a.orden - b.orden)[0];
    return {
      id: h.id,
      slug: h.slug,
      nombre: h.nombre,
      tipo: h.tipo,
      estado: h.estado,
      updated_at: h.updated_at,
      destino_slug: h.destinos.slug,
      destino_nombre: h.destinos.nombre,
      foto_principal_path: principal?.storage_path,
    };
  });
}

export async function getMyHospedaje(
  id: string,
  hospedajesIds: string[]
): Promise<(HospedajeRow & { hospedaje_fotos: HospedajeFotoRow[] }) | null> {
  if (!hospedajesIds.includes(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("hospedajes")
    .select("*, hospedaje_fotos(*)")
    .eq("id", id)
    .maybeSingle();
  return data as (HospedajeRow & { hospedaje_fotos: HospedajeFotoRow[] }) | null;
}
