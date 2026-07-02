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
  // Obtener destino con su ciudad y zonas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: destinoData, error: destinoError } = await (sb as any).from(
    "destinos"
  ).select("ciudad_id").eq("id", destinoId).maybeSingle();

  if (destinoError) throw destinoError;
  if (!destinoData) return [];

  // Obtener zonas del destino
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zonasData, error: zonasError } = await (sb as any).from(
    "zona_destinos"
  ).select("zona_id").eq("destino_id", destinoId);

  if (zonasError) throw zonasError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zonaIds = zonasData?.map((z: any) => z.zona_id) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ciudadId = (destinoData as any).ciudad_id;

  // UNION: destino + zonas + ciudad, prioridad: destino > zona > ciudad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosDestino, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select(
    "id, rubro_id, nombre, direccion, contacto, foto_path, scope_type, scope_id, created_at"
  ).eq("scope_type", "destino").eq("scope_id", destinoId).order("rubro_id, nombre");

  if (error1) throw error1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosZona: any[] = [];
  if (zonaIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error2 } = await (sb as any).from("datos_utiles").select(
      "id, rubro_id, nombre, direccion, contacto, foto_path, scope_type, scope_id, created_at"
    ).eq("scope_type", "zona").in("scope_id", zonaIds).order("rubro_id, nombre");

    if (error2) throw error2;
    datosZona = data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosCiudad: any[] = [];
  if (ciudadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error3 } = await (sb as any).from("datos_utiles").select(
      "id, rubro_id, nombre, direccion, contacto, foto_path, scope_type, scope_id, created_at"
    ).eq("scope_type", "ciudad").eq("scope_id", ciudadId).order("rubro_id, nombre");

    if (error3) throw error3;
    datosCiudad = data || [];
  }

  // Mergear con deduplicación por (rubro_id, nombre): destino > zona > ciudad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged = new Map<string, any>();

  // Agregar en orden de prioridad inversa para que el último sobrescriba
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosCiudad?.forEach((d: any) => merged.set(`${d.rubro_id}:${d.nombre}`, d));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosZona?.forEach((d: any) => merged.set(`${d.rubro_id}:${d.nombre}`, d));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosDestino?.forEach((d: any) => merged.set(`${d.rubro_id}:${d.nombre}`, d));

  return Array.from(merged.values()).sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => {
      if (a.rubro_id !== b.rubro_id) return a.rubro_id.localeCompare(b.rubro_id);
      return a.nombre.localeCompare(b.nombre);
    }
  );
}

export async function listDatosUtilesByRubro(destinoId: string, rubroId: string) {
  const sb = createAdminClient();
  // Obtener destino con su ciudad y zonas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: destinoData, error: destinoError } = await (sb as any).from(
    "destinos"
  ).select("ciudad_id").eq("id", destinoId).maybeSingle();

  if (destinoError) throw destinoError;
  if (!destinoData) return [];

  // Obtener zonas del destino
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zonasData, error: zonasError } = await (sb as any).from(
    "zona_destinos"
  ).select("zona_id").eq("destino_id", destinoId);

  if (zonasError) throw zonasError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zonaIds = zonasData?.map((z: any) => z.zona_id) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ciudadId = (destinoData as any).ciudad_id;

  // UNION por rubro: destino > zona > ciudad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosDestino, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select("id, nombre, direccion, contacto, foto_path, scope_type").eq(
    "scope_type",
    "destino"
  ).eq("scope_id", destinoId).eq("rubro_id", rubroId).order("nombre");

  if (error1) throw error1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosZona: any[] = [];
  if (zonaIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error2 } = await (sb as any).from("datos_utiles").select(
      "id, nombre, direccion, contacto, foto_path, scope_type"
    ).eq("scope_type", "zona").in("scope_id", zonaIds).eq("rubro_id", rubroId).order(
      "nombre"
    );

    if (error2) throw error2;
    datosZona = data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosCiudad: any[] = [];
  if (ciudadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error3 } = await (sb as any).from("datos_utiles").select(
      "id, nombre, direccion, contacto, foto_path, scope_type"
    ).eq("scope_type", "ciudad").eq("scope_id", ciudadId).eq("rubro_id", rubroId).order(
      "nombre"
    );

    if (error3) throw error3;
    datosCiudad = data || [];
  }

  // Mergear con deduplicación por nombre: destino > zona > ciudad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const merged = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosCiudad?.forEach((d: any) => merged.set(d.nombre, d));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosZona?.forEach((d: any) => merged.set(d.nombre, d));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosDestino?.forEach((d: any) => merged.set(d.nombre, d));

  return Array.from(merged.values()).sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.nombre.localeCompare(b.nombre)
  );
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
  // Obtener destino con su ciudad y zonas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: destinoData, error: destinoError } = await (sb as any).from(
    "destinos"
  ).select("ciudad_id").eq("id", destinoId).maybeSingle();

  if (destinoError) throw destinoError;
  if (!destinoData) return new Map<string, number>();

  // Obtener zonas del destino
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: zonasData, error: zonasError } = await (sb as any).from(
    "zona_destinos"
  ).select("zona_id").eq("destino_id", destinoId);

  if (zonasError) throw zonasError;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zonaIds = zonasData?.map((z: any) => z.zona_id) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ciudadId = (destinoData as any).ciudad_id;

  // UNION: destino + zonas + ciudad
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosDestino, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select("rubro_id, nombre").eq("scope_type", "destino").eq("scope_id", destinoId);

  if (error1) throw error1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosZona: any[] = [];
  if (zonaIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error2 } = await (sb as any).from("datos_utiles").select(
      "rubro_id, nombre"
    ).eq("scope_type", "zona").in("scope_id", zonaIds);

    if (error2) throw error2;
    datosZona = data || [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let datosCiudad: any[] = [];
  if (ciudadId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: error3 } = await (sb as any).from("datos_utiles").select(
      "rubro_id, nombre"
    ).eq("scope_type", "ciudad").eq("scope_id", ciudadId);

    if (error3) throw error3;
    datosCiudad = data || [];
  }

  // Mergear con deduplicación por (rubro_id, nombre): destino > zona > ciudad
  const merged = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosCiudad?.forEach((d: any) => merged.add(`${d.rubro_id}:${d.nombre}`));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosZona?.forEach((d: any) => merged.add(`${d.rubro_id}:${d.nombre}`));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosDestino?.forEach((d: any) => merged.add(`${d.rubro_id}:${d.nombre}`));

  // Contar por rubro
  const counts = new Map<string, number>();
  merged.forEach((key) => {
    const rubroId = key.split(":")[0];
    const count = counts.get(rubroId) || 0;
    counts.set(rubroId, count + 1);
  });

  return counts;
}

export async function listDatosUtilesByCiudad(ciudadId: string) {
  const sb = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosCiudad, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select(
    "id, rubro_id, nombre, direccion, contacto, foto_path, scope_type, scope_id, created_at"
  ).eq("scope_type", "ciudad").eq("scope_id", ciudadId).order("rubro_id, nombre");

  if (error1) throw error1;

  return datosCiudad || [];
}

export async function countItemsByRubroCiudad(ciudadId: string) {
  const sb = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosCiudad, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select("rubro_id, nombre").eq("scope_type", "ciudad").eq("scope_id", ciudadId);

  if (error1) throw error1;

  // Contar por rubro
  const counts = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosCiudad?.forEach((d: any) => {
    const count = counts.get(d.rubro_id) || 0;
    counts.set(d.rubro_id, count + 1);
  });

  return counts;
}

export async function listDatosUtilesByZona(zonaId: string) {
  const sb = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosZona, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select(
    "id, rubro_id, nombre, direccion, contacto, foto_path, scope_type, scope_id, created_at"
  ).eq("scope_type", "zona").eq("scope_id", zonaId).order("rubro_id, nombre");

  if (error1) throw error1;

  return datosZona || [];
}

export async function countItemsByRubroZona(zonaId: string) {
  const sb = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: datosZona, error: error1 } = await (sb as any).from(
    "datos_utiles"
  ).select("rubro_id, nombre").eq("scope_type", "zona").eq("scope_id", zonaId);

  if (error1) throw error1;

  // Contar por rubro
  const counts = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datosZona?.forEach((d: any) => {
    const count = counts.get(d.rubro_id) || 0;
    counts.set(d.rubro_id, count + 1);
  });

  return counts;
}
