import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFotoUrl } from "@/lib/storage";
import type {
  ComboRow,
  ComboItemRow,
  ComercioTipo,
  EstadoCombo,
} from "@/types/database";

// =============================================================================
// Capa de datos de combos (sinergias). Resuelve los items polimórficos a la
// metadata del comercio (nombre, foto heredada, whatsapp, descripción) y arma
// el target de WhatsApp (hospedaje ancla con fallback).
// =============================================================================

interface FotoJoin {
  storage_path: string;
  es_principal: boolean;
  orden: number;
}

function pickFotoUrl(fotos: FotoJoin[] | null | undefined): string | null {
  if (!fotos || fotos.length === 0) return null;
  const principal =
    fotos.find((f) => f.es_principal) ??
    [...fotos].sort((a, b) => a.orden - b.orden)[0];
  return principal ? getFotoUrl(principal.storage_path) : null;
}

interface ComercioFull {
  id: string;
  tipo: ComercioTipo;
  slug: string;
  nombre: string;
  descripcionCorta: string | null;
  fotoUrl: string | null;
  whatsapp: string | null;
  estado: string;
  destino: { id: string; slug: string; nombre: string };
}

async function resolveComerciosFull(
  refs: Array<{ tipo: ComercioTipo; id: string }>
): Promise<Map<string, ComercioFull>> {
  const out = new Map<string, ComercioFull>();
  if (refs.length === 0) return out;
  const sb = createAdminClient();

  const hospedajeIds = refs.filter((r) => r.tipo === "hospedaje").map((r) => r.id);
  const lugarIds = refs.filter((r) => r.tipo !== "hospedaje").map((r) => r.id);

  if (hospedajeIds.length > 0) {
    const { data } = (await sb
      .from("hospedajes")
      .select(
        "id, slug, nombre, estado, whatsapp, descripcion_corta, destinos!inner(id, slug, nombre), hospedaje_fotos(storage_path, es_principal, orden)"
      )
      .in("id", hospedajeIds)) as {
      data:
        | Array<{
            id: string;
            slug: string;
            nombre: string;
            estado: string;
            whatsapp: string | null;
            descripcion_corta: string | null;
            destinos: { id: string; slug: string; nombre: string } | null;
            hospedaje_fotos: FotoJoin[] | null;
          }>
        | null;
    };
    for (const h of data ?? []) {
      if (!h.destinos) continue;
      out.set(`hospedaje:${h.id}`, {
        id: h.id,
        tipo: "hospedaje",
        slug: h.slug,
        nombre: h.nombre,
        descripcionCorta: h.descripcion_corta,
        fotoUrl: pickFotoUrl(h.hospedaje_fotos),
        whatsapp: h.whatsapp,
        estado: h.estado,
        destino: h.destinos,
      });
    }
  }

  if (lugarIds.length > 0) {
    const { data } = (await sb
      .from("lugares")
      .select(
        "id, slug, nombre, tipo, estado, whatsapp, descripcion_corta, destinos!inner(id, slug, nombre), lugar_fotos(storage_path, es_principal, orden)"
      )
      .in("id", lugarIds)) as {
      data:
        | Array<{
            id: string;
            slug: string;
            nombre: string;
            tipo: "gastronomico" | "atractivo";
            estado: string;
            whatsapp: string | null;
            descripcion_corta: string | null;
            destinos: { id: string; slug: string; nombre: string } | null;
            lugar_fotos: FotoJoin[] | null;
          }>
        | null;
    };
    for (const l of data ?? []) {
      if (!l.destinos) continue;
      out.set(`${l.tipo}:${l.id}`, {
        id: l.id,
        tipo: l.tipo,
        slug: l.slug,
        nombre: l.nombre,
        descripcionCorta: l.descripcion_corta,
        fotoUrl: pickFotoUrl(l.lugar_fotos),
        whatsapp: l.whatsapp,
        estado: l.estado,
        destino: l.destinos,
      });
    }
  }

  return out;
}

async function fetchItems(comboIds: string[]): Promise<Map<string, ComboItemRow[]>> {
  const map = new Map<string, ComboItemRow[]>();
  if (comboIds.length === 0) return map;
  const sb = createAdminClient();
  const { data } = (await sb
    .from("combo_items")
    .select("*")
    .in("combo_id", comboIds)
    .order("orden", { ascending: true })) as { data: ComboItemRow[] | null };
  for (const it of data ?? []) {
    const arr = map.get(it.combo_id) ?? [];
    arr.push(it);
    map.set(it.combo_id, arr);
  }
  return map;
}

// -----------------------------------------------------------------------------
// Público
// -----------------------------------------------------------------------------

export interface ComboItemPublic {
  tipo: ComercioTipo;
  slug: string | null;
  nombre: string;
  descripcionCorta: string | null;
  fotoUrl: string | null;
  beneficio: string;
}

export interface ComboPublic {
  id: string;
  slug: string;
  titulo: string;
  bajada: string | null;
  noches: number;
  precioDesde: number | null;
  ahorroPct: number | null;
  beneficios: string[];
  validez: string | null;
  destinoNombre: string;
  destinoSlug: string;
  heroUrl: string | null;
  items: ComboItemPublic[];
  /** WhatsApp del hospedaje ancla (o 1er item con whatsapp). */
  whatsapp: { numero: string; nombre: string } | null;
}

function toComboPublic(
  combo: ComboRow,
  items: ComboItemRow[],
  comercios: Map<string, ComercioFull>
): ComboPublic {
  const resolved = items.map((it) => {
    const c = comercios.get(`${it.comercio_tipo}:${it.comercio_id}`);
    return {
      it,
      c,
      pub: {
        tipo: it.comercio_tipo,
        slug: c?.slug ?? null,
        nombre: c?.nombre ?? "Por confirmar",
        descripcionCorta: c?.descripcionCorta ?? null,
        fotoUrl: c?.fotoUrl ?? null,
        beneficio: it.beneficio,
      } as ComboItemPublic,
    };
  });

  // Hero: si hay comercio_principal, usarlo; sino, hospedaje ancla con fallback.
  let heroUrl: string | null = null;
  if (combo.comercio_principal_tipo && combo.comercio_principal_id) {
    const principal = comercios.get(
      `${combo.comercio_principal_tipo}:${combo.comercio_principal_id}`
    );
    heroUrl = principal?.fotoUrl ?? null;
  }
  if (!heroUrl) {
    const anchor = resolved.find((r) => r.c?.tipo === "hospedaje" && r.c.fotoUrl);
    heroUrl =
      anchor?.c?.fotoUrl ?? resolved.find((r) => r.pub.fotoUrl)?.pub.fotoUrl ?? null;
  }

  // WhatsApp: hospedaje ancla con whatsapp → fallback 1er item con whatsapp.
  const waSource =
    resolved.find((r) => r.c?.tipo === "hospedaje" && r.c.whatsapp)?.c ??
    resolved.find((r) => r.c?.whatsapp)?.c ??
    null;

  // Destino del combo: el del hospedaje ancla, o el del 1er item resuelto.
  const anchor = resolved.find((r) => r.c?.tipo === "hospedaje");
  const destino =
    anchor?.c?.destino ?? resolved.find((r) => r.c?.destino)?.c?.destino ?? null;

  return {
    id: combo.id,
    slug: combo.slug,
    titulo: combo.titulo,
    bajada: combo.bajada,
    noches: combo.noches,
    precioDesde: combo.precio_desde,
    ahorroPct: combo.ahorro_pct,
    beneficios: combo.beneficios ?? [],
    validez: combo.validez,
    destinoNombre: destino?.nombre ?? "",
    destinoSlug: destino?.slug ?? "",
    heroUrl,
    items: resolved.map((r) => r.pub),
    whatsapp: waSource?.whatsapp
      ? { numero: waSource.whatsapp, nombre: waSource.nombre }
      : null,
  };
}

/** Combos publicados de un destino e interzona (para la sección del destino).
 * Un combo aparece en destino D si alguno de sus comercios está ubicado en D.
 * Esto permite que combos con pizzería de Mar de las Pampas + hospedaje de Las Gaviotas
 * aparezcan en AMBOS destinos. */
export async function listCombosByDestino(
  destinoId: string
): Promise<ComboPublic[]> {
  const sb = await createClient();
  const sbAdmin = createAdminClient();

  // Obtener zonas del destino
  const { data: destZonas } = (await sbAdmin
    .from("zona_destinos")
    .select("zona_id")
    .eq("destino_id", destinoId)) as { data: Array<{ zona_id: string }> | null };

  let zonaIds: string[] = [];
  if (destZonas && destZonas.length > 0) {
    zonaIds = destZonas.map((z) => z.zona_id);
  }

  // Obtener todos los destinos en esas zonas (para buscar combos)
  let destinoIdsInZones: string[] = [];
  if (zonaIds.length > 0) {
    const { data: destZonasAll } = (await sbAdmin
      .from("zona_destinos")
      .select("destino_id")
      .in("zona_id", zonaIds)) as { data: Array<{ destino_id: string }> | null };
    if (destZonasAll) {
      destinoIdsInZones = Array.from(new Set(destZonasAll.map((dz) => dz.destino_id)));
    }
  }

  // Obtener combos publicados de esos destinos (o del actual si sin zonas)
  const searchDestinos = destinoIdsInZones.length > 0 ? destinoIdsInZones : [destinoId];
  const { data: combos } = (await sb
    .from("combos")
    .select("*")
    .in("destino_id", searchDestinos)
    .eq("estado", "publicado")
    .order("created_at", { ascending: false })) as { data: ComboRow[] | null };

  if (!combos || combos.length === 0) return [];

  // Cargar items y comercios
  const itemsByCombo = await fetchItems(combos.map((c) => c.id));
  const allRefs = [...itemsByCombo.values()]
    .flat()
    .map((it) => ({ tipo: it.comercio_tipo, id: it.comercio_id }));
  const comercios = await resolveComerciosFull(allRefs);

  // Filtrar: un combo aparece en destino D si alguno de sus comercios está en D
  const combosVisibles = combos.filter((combo) => {
    const items = itemsByCombo.get(combo.id) ?? [];
    return items.some((item) => {
      const comercio = comercios.get(`${item.comercio_tipo}:${item.comercio_id}`);
      return comercio?.destino.id === destinoId;
    });
  });

  return combosVisibles.map((c) =>
    toComboPublic(c, itemsByCombo.get(c.id) ?? [], comercios)
  );
}

/**
 * Combos publicados de toda la red (para la tab "Promos" de la home, que muestra
 * promos + combos mezclados). Hoy, con un solo destino, son todos de la zona.
 *
 * TODO multi-destino: cuando haya varios destinos, la home antes de elegir
 * debería priorizar últimas búsquedas y, si no hay, lo más cercano
 * geográficamente. Por ahora se muestran todos mezclados (decisión 2026-05-29).
 */
export async function listCombosRed(): Promise<ComboPublic[]> {
  const sb = await createClient();
  const { data: combos } = (await sb
    .from("combos")
    .select("*")
    .eq("estado", "publicado")
    .order("created_at", { ascending: false })) as { data: ComboRow[] | null };
  if (!combos || combos.length === 0) return [];

  const itemsByCombo = await fetchItems(combos.map((c) => c.id));
  const allRefs = [...itemsByCombo.values()]
    .flat()
    .map((it) => ({ tipo: it.comercio_tipo, id: it.comercio_id }));
  const comercios = await resolveComerciosFull(allRefs);

  return combos.map((c) =>
    toComboPublic(c, itemsByCombo.get(c.id) ?? [], comercios)
  );
}

// -----------------------------------------------------------------------------
// Gestión (admin / responsable)
// -----------------------------------------------------------------------------

export interface ComboAdminRow extends ComboRow {
  destinoNombre: string;
  itemsResumen: string;
}

async function hydrateCombos(combos: ComboRow[]): Promise<ComboAdminRow[]> {
  if (combos.length === 0) return [];
  const itemsByCombo = await fetchItems(combos.map((c) => c.id));
  const allRefs = [...itemsByCombo.values()]
    .flat()
    .map((it) => ({ tipo: it.comercio_tipo, id: it.comercio_id }));
  const comercios = await resolveComerciosFull(allRefs);

  // Nombre del destino.
  const sb = createAdminClient();
  const destinoIds = Array.from(new Set(combos.map((c) => c.destino_id)));
  const { data: destinos } = (await sb
    .from("destinos")
    .select("id, nombre")
    .in("id", destinoIds)) as { data: Array<{ id: string; nombre: string }> | null };
  const destinoNombre = new Map((destinos ?? []).map((d) => [d.id, d.nombre]));

  return combos.map((c) => {
    const items = itemsByCombo.get(c.id) ?? [];
    const resumen = items
      .map(
        (it) =>
          comercios.get(`${it.comercio_tipo}:${it.comercio_id}`)?.nombre ??
          "—"
      )
      .join(" + ");
    return {
      ...c,
      destinoNombre: destinoNombre.get(c.destino_id) ?? "",
      itemsResumen: resumen,
    };
  });
}

export async function listCombosAdmin(
  destinoId: string | null,
  estado?: EstadoCombo
): Promise<ComboAdminRow[]> {
  const sb = createAdminClient();
  let q = sb.from("combos").select("*").order("created_at", { ascending: false });
  if (destinoId) q = q.eq("destino_id", destinoId);
  if (estado) q = q.eq("estado", estado);
  const { data } = (await q) as { data: ComboRow[] | null };
  return hydrateCombos(data ?? []);
}

export async function listCombosPendientesValidacion(
  destinoId: string | null
): Promise<ComboAdminRow[]> {
  return listCombosAdmin(destinoId, "pendiente_validacion");
}

export async function listCombosDelResponsable(
  perfilId: string
): Promise<ComboAdminRow[]> {
  const sb = createAdminClient();
  const { data } = (await sb
    .from("combos")
    .select("*")
    .eq("creado_por", perfilId)
    .order("created_at", { ascending: false })) as { data: ComboRow[] | null };
  return hydrateCombos(data ?? []);
}

export interface ComboWithItems {
  combo: ComboRow;
  items: ComboItemRow[];
}

export async function getComboById(id: string): Promise<ComboWithItems | null> {
  const sb = createAdminClient();
  const { data: combo } = await sb
    .from("combos")
    .select("*")
    .eq("id", id)
    .maybeSingle<ComboRow>();
  if (!combo) return null;
  const itemsByCombo = await fetchItems([id]);
  return { combo, items: itemsByCombo.get(id) ?? [] };
}

// -----------------------------------------------------------------------------
// Opciones del select de comercio del form
// -----------------------------------------------------------------------------

export interface ComercioOption {
  tipo: ComercioTipo;
  id: string;
  nombre: string;
  destinoId: string;
  destinoNombre: string;
}

/** Destino_ids donde el responsable tiene al menos un comercio. */
export async function getResponsableDestinoIds(perfilId: string): Promise<string[]> {
  const sb = createAdminClient();
  const { data: resp } = (await sb
    .from("responsabilidades")
    .select("entidad_tipo, entidad_id")
    .eq("perfil_id", perfilId)) as {
    data: Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }> | null;
  };
  const hospIds = (resp ?? []).filter((r) => r.entidad_tipo === "hospedaje").map((r) => r.entidad_id);
  const lugarIds = (resp ?? []).filter((r) => r.entidad_tipo === "lugar").map((r) => r.entidad_id);
  const destinos = new Set<string>();
  if (hospIds.length > 0) {
    const { data } = (await sb.from("hospedajes").select("destino_id").in("id", hospIds)) as {
      data: Array<{ destino_id: string }> | null;
    };
    for (const h of data ?? []) destinos.add(h.destino_id);
  }
  if (lugarIds.length > 0) {
    const { data } = (await sb.from("lugares").select("destino_id").in("id", lugarIds)) as {
      data: Array<{ destino_id: string }> | null;
    };
    for (const l of data ?? []) destinos.add(l.destino_id);
  }
  return [...destinos];
}

/**
 * Comercios publicados disponibles para armar un combo. Admin → del destino (o
 * todos si super). Responsable → de todos los destinos en las zonas donde tiene
 * comercios (puede cruzar con comercios de otros dueños; el admin valida).
 */
export async function listComerciosParaCombo(params: {
  modo: "admin" | "responsable";
  destinoId?: string | null;
  perfilId?: string;
}): Promise<ComercioOption[]> {
  const sb = createAdminClient();
  let destinoIds: string[] | null = null;

  if (params.modo === "admin") {
    destinoIds = params.destinoId ? [params.destinoId] : null; // null = todos
  } else {
    // Para responsable: obtener destinos donde tiene comercios
    const miDestinos = await getResponsableDestinoIds(params.perfilId ?? "");
    if (miDestinos.length === 0) return [];

    // Obtener las zonas de esos destinos
    const { data: zonas } = (await sb
      .from("zona_destinos")
      .select("zona_id")
      .in("destino_id", miDestinos)) as { data: Array<{ zona_id: string }> | null };

    if (!zonas || zonas.length === 0) {
      // Sin zonas, solo mostrar sus destinos propios
      destinoIds = miDestinos;
    } else {
      // Obtener todos los destinos de esas zonas
      const zonaIds = Array.from(new Set(zonas.map(z => z.zona_id)));
      const { data: destZonas } = (await sb
        .from("zona_destinos")
        .select("destino_id")
        .in("zona_id", zonaIds)) as { data: Array<{ destino_id: string }> | null };

      destinoIds = destZonas ? Array.from(new Set(destZonas.map(dz => dz.destino_id))) : miDestinos;
    }
  }

  let hq = sb
    .from("hospedajes")
    .select("id, nombre, destinos!inner(id, nombre)")
    .eq("estado", "publicado");
  let lq = sb
    .from("lugares")
    .select("id, nombre, tipo, destinos!inner(id, nombre)")
    .eq("estado", "publicado");
  if (destinoIds) {
    hq = hq.in("destino_id", destinoIds);
    lq = lq.in("destino_id", destinoIds);
  }

  const [{ data: hs }, { data: ls }] = (await Promise.all([hq, lq])) as [
    { data: Array<{ id: string; nombre: string; destinos: { id: string; nombre: string } }> | null },
    { data: Array<{ id: string; nombre: string; tipo: "gastronomico" | "atractivo"; destinos: { id: string; nombre: string } }> | null }
  ];

  const options: ComercioOption[] = [];
  for (const h of hs ?? [])
    options.push({ tipo: "hospedaje", id: h.id, nombre: h.nombre, destinoId: h.destinos.id, destinoNombre: h.destinos.nombre });
  for (const l of ls ?? [])
    options.push({ tipo: l.tipo, id: l.id, nombre: l.nombre, destinoId: l.destinos.id, destinoNombre: l.destinos.nombre });
  return options;
}

/** Resuelve el destino de un comercio (para validar que todos sean del mismo). */
export async function getComercioDestinoId(
  tipo: ComercioTipo,
  id: string
): Promise<string | null> {
  const sb = createAdminClient();
  const tabla = tipo === "hospedaje" ? "hospedajes" : "lugares";
  const { data } = await sb
    .from(tabla)
    .select("destino_id, tipo")
    .eq("id", id)
    .maybeSingle<{ destino_id: string; tipo?: string }>();
  if (!data) return null;
  if (tipo !== "hospedaje" && data.tipo !== tipo) return null;
  return data.destino_id;
}

/** Resuelve las zonas de un comercio (para validar que todos compartan zona). */
export async function getComercioZonasIds(
  tipo: ComercioTipo,
  id: string
): Promise<string[] | null> {
  const sb = createAdminClient();
  const tabla = tipo === "hospedaje" ? "hospedajes" : "lugares";

  // Obtener el destino del comercio
  const { data: comercio } = await sb
    .from(tabla)
    .select("destino_id, tipo")
    .eq("id", id)
    .maybeSingle<{ destino_id: string; tipo?: string }>();

  if (!comercio) return null;
  if (tipo !== "hospedaje" && comercio.tipo !== tipo) return null;

  // Obtener las zonas de ese destino
  const { data: zonasData } = (await sb
    .from("zona_destinos")
    .select("zona_id")
    .eq("destino_id", comercio.destino_id)) as { data: Array<{ zona_id: string }> | null };

  return zonasData?.map(z => z.zona_id) ?? [];
}
