import { createAdminClient } from "@/lib/supabase/admin";

export async function listRubros() {
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any)
    .from("rubros")
    .select("id, slug, nombre, icono_default, descripcion")
    .order("nombre");

  if (error) throw error;
  return data || [];
}

export async function listDatosUtilesByDestino(destinoId: string) {
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any)
    .from("datos_utiles")
    .select("id, rubro_id, nombre, direccion, contacto, foto_path, created_at")
    .eq("destino_id", destinoId)
    .order("rubro_id, nombre");

  if (error) throw error;
  return data || [];
}

export async function listDatosUtilesByRubro(destinoId: string, rubroId: string) {
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any)
    .from("datos_utiles")
    .select("id, nombre, direccion, contacto, foto_path")
    .eq("destino_id", destinoId)
    .eq("rubro_id", rubroId)
    .order("nombre");

  if (error) throw error;
  return data || [];
}

export async function getRubroById(rubroId: string) {
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any)
    .from("rubros")
    .select("id, slug, nombre, icono_default, descripcion")
    .eq("id", rubroId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function countItemsByRubro(destinoId: string) {
  const sb = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any)
    .from("datos_utiles")
    .select("rubro_id")
    .eq("destino_id", destinoId);

  if (error) throw error;

  const counts = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?.forEach((item: any) => {
    const count = counts.get(item.rubro_id) || 0;
    counts.set(item.rubro_id, count + 1);
  });

  return counts;
}
