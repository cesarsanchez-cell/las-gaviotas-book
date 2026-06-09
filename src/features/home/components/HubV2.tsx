"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Store,
  LocateFixed,
  MapPinOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AirbnbTop } from "./AirbnbTop";
import { HeroCarousel, type HeroSlide } from "@/features/destinos/components/HeroCarousel";
import { PromosHero } from "@/features/promos/components/PromosHero";
import { SearchPanel } from "./SearchPanel";
import { ItemCard } from "./ItemCard";
import { PromoDetailModal } from "@/features/promos/components/PromoDetailModal";
import { DestinoMiniCard, type DestinoMini } from "./DestinoMiniCard";
import { CombosCarousel } from "@/features/combos/components/CombosCarousel";
import { ComboDetailModal } from "@/features/combos/components/ComboDetailModal";
import { ArmadorCTA } from "@/features/armador/components/ArmadorCTA";
import type { ComboPublic } from "@/features/combos/lib/queries";
import type { PromoPublic } from "@/features/promos/lib/queries";
import {
  EMPTY_SEARCH,
  VERTICAL_TITLE,
  VERTICAL_NOUN,
  type SearchState,
  type HubTab,
} from "@/features/home/lib/search-types";
import type {
  VerticalKey,
  VerticalItem,
  DestinoPublicadoLite,
  RegionVisible,
} from "@/features/home/lib/queries";
import type { HeaderSession } from "@/features/home/lib/header-session";

// Umbral de promos para que el hero sea de promos; con menos, cae a destacados.
const PROMO_HERO_MIN = 3;

// Orden de las verticales en las bandas de la home (cuando no hay una enfocada).
const VERTICAL_KEYS: VerticalKey[] = ["hospedajes", "gastronomia", "atractivos"];

interface HubV2Props {
  verticalData: Record<VerticalKey, VerticalItem[]>;
  destinos: DestinoPublicadoLite[];
  regiones: RegionVisible[];
  promos: PromoPublic[];
  combos: ComboPublic[];
  session: HeaderSession;
  /** Slides del hero de destacados (fallback cuando no hay suficientes promos). */
  heroSlides?: HeroSlide[];
  heroTitle?: string;
  heroEyebrow?: string | null;
  heroSubtitle?: string | null;
  /**
   * Si está, el hub queda scopeado a este destino: oculta chips de región y la
   * banda "Cerca tuyo", el logo/volver navega a la red (`/`), y el contenido es
   * una grilla (no filas por destino).
   */
  scopedDestino?: { slug: string; nombre: string } | null;
}

type GeoState = "idle" | "granted" | "denied";

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function HubV2({
  verticalData,
  destinos,
  regiones,
  promos,
  combos,
  session,
  heroSlides = [],
  heroTitle,
  heroEyebrow,
  heroSubtitle,
  scopedDestino = null,
}: HubV2Props) {
  const router = useRouter();
  // null = landing (hero + promos + combos, sin grilla). Una vertical = vista
  // enfocada: SOLO esa vertical, sin hero ni promos.
  const [tab, setTab] = React.useState<HubTab | null>(null);
  const [search, setSearch] = React.useState<SearchState>(EMPTY_SEARCH);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [geo, setGeo] = React.useState<GeoState>("idle");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [comboSel, setComboSel] = React.useState<ComboPublic | null>(null);
  const [promoSel, setPromoSel] = React.useState<PromoPublic | null>(null);

  // Persistimos la vertical en la URL (?v=) con history.replaceState — sin
  // navegación de Next. Tocar la vertical activa de nuevo vuelve al landing.
  const changeTab = React.useCallback(
    (next: HubTab) => {
      // Toggle: tocar la vertical activa vuelve al landing.
      const nextTab = tab === next ? null : next;
      setTab(nextTab);
      // El replaceState va en el handler (no en el updater de setState): Next
      // intercepta replaceState como update del Router, y hacerlo durante el
      // render dispara "setState in render".
      const params = new URLSearchParams(window.location.search);
      if (nextTab) params.set("v", nextTab);
      else params.delete("v");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      );
    },
    [tab]
  );

  // Al montar (incluido back del navegador / ?v= de la barra interna),
  // enfocamos la vertical de la URL; sin ?v= queda en landing.
  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v === "hospedajes" || v === "gastronomia" || v === "atractivos") {
      setTab(v);
    }
  }, []);

  const hasDonde = Boolean(search.donde.trim());

  // Slugs de destino permitidos por el "dónde" (matchea destino o región).
  const dondeSlugs = React.useMemo(() => {
    if (!hasDonde) return null;
    const q = search.donde.toLowerCase();
    const set = new Set<string>();
    for (const d of destinos) {
      // Matchea por nombre del destino o por su ciudad (ej. "Villa Gesell"
      // trae Las Gaviotas, Mar Azul…). La región va por el loop de abajo.
      if (
        d.nombre.toLowerCase().includes(q) ||
        (d.ciudad_label?.toLowerCase().includes(q) ?? false)
      ) {
        set.add(d.slug);
      }
    }
    for (const r of regiones) {
      if (r.nombre.toLowerCase().includes(q)) {
        r.destinos_slugs.forEach((s) => set.add(s));
      }
    }
    return set;
  }, [hasDonde, search.donde, destinos, regiones]);

  // Slugs permitidos combinando región + dónde (null = sin filtro).
  const allowedSlugs = React.useMemo(() => {
    let set: Set<string> | null = null;
    if (regionFilter) {
      const region = regiones.find((r) => r.slug === regionFilter);
      set = new Set(region?.destinos_slugs ?? []);
    }
    if (dondeSlugs) {
      set = set
        ? new Set([...set].filter((s) => dondeSlugs.has(s)))
        : new Set(dondeSlugs);
    }
    return set;
  }, [regionFilter, dondeSlugs, regiones]);

  // Vertical que se muestra en la grilla: la enfocada, o hospedajes en landing.
  const activeVertical: VerticalKey = tab ?? "hospedajes";

  // Grilla de la vertical activa, filtrada por región + dónde + tipo.
  const items = React.useMemo(() => {
    let all = verticalData[activeVertical] ?? [];
    if (allowedSlugs) all = all.filter((it) => allowedSlugs.has(it.destino.slug));
    if (activeVertical !== "hospedajes" && search.tipo) {
      all = all.filter((it) => it.tipoLabel === search.tipo);
    }
    return all;
  }, [verticalData, activeVertical, allowedSlugs, search.tipo]);

  // Sin vertical enfocada mostramos una banda por vertical. Cada una con sus
  // items filtrados por región/dónde (allowedSlugs) + el tipo si aplica.
  const itemsByVertical = React.useMemo(() => {
    const r = {} as Record<VerticalKey, VerticalItem[]>;
    for (const k of VERTICAL_KEYS) {
      let all = verticalData[k] ?? [];
      if (allowedSlugs) all = all.filter((it) => allowedSlugs.has(it.destino.slug));
      if (k !== "hospedajes" && search.tipo) {
        all = all.filter((it) => it.tipoLabel === search.tipo);
      }
      r[k] = all;
    }
    return r;
  }, [verticalData, allowedSlugs, search.tipo]);

  // Promos y combos acotados al destino/región elegido (o todos si no hay filtro).
  const promosVisibles = React.useMemo(
    () =>
      allowedSlugs
        ? promos.filter((p) => allowedSlugs.has(p.destino.slug))
        : promos,
    [promos, allowedSlugs]
  );
  const combosVisibles = React.useMemo(
    () =>
      allowedSlugs
        ? combos.filter((c) => allowedSlugs.has(c.destinoSlug))
        : combos,
    [combos, allowedSlugs]
  );

  // Destinos cercanos por distancia (solo con geo concedida).
  const nearby: DestinoMini[] = React.useMemo(() => {
    if (geo !== "granted" || !coords) return [];
    return [...destinos]
      .filter((d) => d.lat != null && d.lng != null)
      .map((d) => ({
        d,
        dist: haversine(coords, { lat: d.lat as number, lng: d.lng as number }),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6)
      .map(({ d }) => ({
        slug: d.slug,
        nombre: d.nombre,
        region: d.region_label,
        biomas: d.biomas,
        hospedajes_count: d.hospedajes_count,
      }));
  }, [geo, coords, destinos]);

  function askGeo() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeo("granted");
      },
      () => setGeo("denied"),
      { timeout: 8000 }
    );
  }

  function goHub() {
    // Scopeado a un destino: el logo lleva a la red completa.
    if (scopedDestino) {
      router.push("/");
      return;
    }
    goLanding();
  }

  // Vuelve al landing del contexto actual (destino o red) con sus promos +
  // combos, sin salir a `/`. Desmarca la vertical y limpia filtros, como si
  // recién entraras. La usan el logo (en la red) y el breadcrumb del destino.
  function goLanding() {
    setTab(null);
    setRegionFilter(null);
    setSearch(EMPTY_SEARCH);
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Resuelve el destino al que mandar la búsqueda de disponibilidad: en el hub
  // scopeado es ese; en la red, solo si el "dónde" matchea un único destino
  // (una región o ambigüedad → null y queda en la grilla).
  function resolveDestinoSlug(state: SearchState): string | null {
    if (scopedDestino) return scopedDestino.slug;
    return resolveDestinoFromQuery(state.donde);
  }

  // Resuelve el "dónde" a un único destino por nombre. Una ciudad o región que
  // abarca varios destinos devuelve null → se filtra en el lugar (no navega).
  function resolveDestinoFromQuery(donde: string): string | null {
    const q = donde.trim().toLowerCase();
    if (!q) return null;
    const exact = destinos.find((d) => d.nombre.toLowerCase() === q);
    if (exact) return exact.slug;
    const matches = destinos.filter((d) => d.nombre.toLowerCase().includes(q));
    return matches.length === 1 ? matches[0].slug : null;
  }

  // Búsqueda inteligente: con fechas en Hospedajes y un destino resolvible,
  // "Buscar" salta al motor de disponibilidad (/[destino]/buscar) con el
  // contexto en la URL — ahí abajo se precarga todo, sin recargar fechas/pax.
  // En cualquier otro caso, filtra la grilla en el lugar (todas las opciones).
  function handleApplySearch(state: SearchState) {
    setSearch(state);
    // Landing (null) o Hospedajes: con fechas + destino → motor de disponibilidad.
    if ((tab === null || tab === "hospedajes") && state.fechas.in) {
      const slug = resolveDestinoSlug(state);
      if (slug) {
        const params = new URLSearchParams({
          check_in: state.fechas.in,
          adultos: String(state.pax.adultos),
          ninos: String(state.pax.menores),
          bebes: String(state.pax.bebes),
        });
        if (state.fechas.out) params.set("check_out", state.fechas.out);
        router.push(`/${slug}/buscar?${params.toString()}`);
        return;
      }
    }
    // Elegir un destino concreto → su home (hero + promos + combos), salvo que
    // ya estemos en él. Una ciudad/región/ambigüedad no resuelve a uno: filtra.
    const target = resolveDestinoFromQuery(state.donde);
    if (target && target !== scopedDestino?.slug) {
      router.push(`/${target}`);
    }
  }

  // Landing: ninguna vertical enfocada. Hero + promos + combos viven solo acá;
  // la grilla se muestra siempre (en landing con la vertical por defecto).
  const isLanding = tab === null;
  const showNearby = !scopedDestino && geo === "granted" && nearby.length > 0;
  const showRegionChips = !scopedDestino && regiones.length > 1;
  // Sin vertical enfocada: bandas por vertical (solo las que tienen contenido).
  const verticalesConContenido = VERTICAL_KEYS.filter(
    (k) => itemsByVertical[k].length > 0
  );
  // Armador es por-destino: con un solo destino tenemos target claro.
  const singleDestino = destinos.length === 1 ? destinos[0] : null;

  // Hero: promos si hay suficientes; si no, destacados. Con un destino/región
  // elegido basta 1 promo (es contexto acotado); sin filtro pedimos el mínimo.
  const showPromoHero =
    promosVisibles.length >= (allowedSlugs ? 1 : PROMO_HERO_MIN);
  const promoHeroEyebrow = scopedDestino
    ? `Promos en ${scopedDestino.nombre}`
    : "Promos";
  const promoHeroSubtitle = scopedDestino
    ? null
    : "Ofertas vigentes en los destinos de la red.";

  return (
    <>
      <AirbnbTop
        vertical={tab}
        onChangeVertical={changeTab}
        onGoHub={goHub}
        scopedDestino={scopedDestino}
        search={search}
        onOpenSearch={() => setSearchOpen(true)}
        session={session}
      />

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={search}
        onApply={handleApplySearch}
        destinos={destinos}
        vertical={tab}
        onUseGeo={askGeo}
      />

      {/* Hero (solo landing): promos del destino/red; destacados como fallback
          únicamente sin destino elegido (los destacados son de toda la red). */}
      {isLanding &&
        (showPromoHero ? (
          <PromosHero
            promos={promosVisibles}
            eyebrow={promoHeroEyebrow}
            title="Lo que conviene ahora"
            subtitle={promoHeroSubtitle}
            onOpen={setPromoSel}
          />
        ) : (
          !allowedSlugs &&
          heroSlides.length > 0 &&
          heroTitle && (
            <HeroCarousel
              eyebrow={heroEyebrow}
              title={heroTitle}
              subtitle={heroSubtitle}
              slides={heroSlides}
            />
          )
        ))}

      <main className="pb-16">
        {/* Combos (escapadas armadas) — banda propia, solo en landing. */}
        {isLanding && combosVisibles.length > 0 && (
          <section className="border-b border-border py-10 md:py-14">
            <div className="container">
              <header className="max-w-2xl">
                <p className="eyebrow flex items-center gap-2">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Escapadas armadas
                </p>
                <h2 className="mt-2 font-display text-2xl tracking-tight text-foreground md:text-3xl">
                  Lo que sólo conseguís acá
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hospedaje, mesa y experiencia en una sola propuesta, con
                  beneficios que no existen por separado.
                </p>
              </header>
            </div>
            <CombosCarousel combos={combosVisibles} onOpen={setComboSel} />
          </section>
        )}

        {/* Armá la tuya — landing, con un solo destino (target directo). */}
        {isLanding && singleDestino && (
          <section className="container pt-10">
            <ArmadorCTA
              compact
              destinoSlug={singleDestino.slug}
              destinoNombre={singleDestino.nombre}
            />
          </section>
        )}

        {/* Cercanos (geolocalización). */}
        {showNearby && (
          <Band
            icon={<LocateFixed className="h-4 w-4" aria-hidden />}
            eyebrow="Cerca tuyo"
            title="Escapadas a pocas horas"
          >
            {nearby.map((d) => (
              <DestinoMiniCard key={d.slug} destino={d} />
            ))}
          </Band>
        )}

        {/* Chips de región */}
        {showRegionChips && (
          <div className="container pt-6">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Filtrar por región"
            >
              <RegionChip
                active={!regionFilter}
                onClick={() => setRegionFilter(null)}
              >
                Todas las regiones
              </RegionChip>
              {regiones.map((r) => (
                <RegionChip
                  key={r.slug}
                  active={regionFilter === r.slug}
                  onClick={() =>
                    setRegionFilter(regionFilter === r.slug ? null : r.slug)
                  }
                >
                  {r.nombre}
                </RegionChip>
              ))}
            </div>
          </div>
        )}

        {/* Contenido. Sin vertical enfocada: una banda por vertical (con su fila
            horizontal). Con vertical enfocada: grilla profunda de esa vertical. */}
        {isLanding ? (
          verticalesConContenido.length === 0 ? (
            <section className="py-8">
              <div className="container">
                <EmptyState
                  noun="lugares"
                  onClear={() => {
                    setRegionFilter(null);
                    setSearch(EMPTY_SEARCH);
                  }}
                />
              </div>
            </section>
          ) : (
            verticalesConContenido.map((k) => (
              <VerticalBand
                key={k}
                title={`${VERTICAL_TITLE[k]}${hasDonde ? ` en ${search.donde}` : ""}`}
                items={itemsByVertical[k]}
                onVerTodos={() => changeTab(k)}
              />
            ))
          )
        ) : (
          <section className="py-8">
            <div className="container">
              <header className="mb-5 flex items-end justify-between gap-4">
                <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  {VERTICAL_TITLE[activeVertical]}
                  {hasDonde ? ` en ${search.donde}` : ""}
                </h2>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {items.length} resultado{items.length === 1 ? "" : "s"}
                </span>
              </header>

              {items.length === 0 ? (
                <EmptyState
                  noun={VERTICAL_NOUN[activeVertical]}
                  onClear={() => {
                    setRegionFilter(null);
                    setSearch(EMPTY_SEARCH);
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((it) => (
                    <ItemCard
                      key={`${it.kind}-${it.destino.slug}-${it.slug}`}
                      item={it}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA comerciante → registro */}
        <section className="container">
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store className="h-5 w-5" aria-hidden />
            </span>
            <p className="flex-1 text-sm text-foreground">
              ¿Tenés un hospedaje, restaurante o atractivo? Sumalo a la red.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Sumar mi propuesta
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      {comboSel && (
        <ComboDetailModal combo={comboSel} onClose={() => setComboSel(null)} />
      )}

      {promoSel && (
        <PromoDetailModal promo={promoSel} onClose={() => setPromoSel(null)} />
      )}
    </>
  );
}

/**
 * Banda de una vertical: título + "ver todos" (enfoca la vertical) + fila
 * horizontal scrolleable. En mobile las cards entran de a 2 (ancho ~46%, con la
 * siguiente asomando para invitar al scroll); en pantallas grandes, fijas.
 */
function VerticalBand({
  title,
  items,
  onVerTodos,
}: {
  title: string;
  items: VerticalItem[];
  onVerTodos: () => void;
}) {
  return (
    <section className="py-6">
      <div className="container">
        <header className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onVerTodos}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Ver todos →
          </button>
        </header>
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
          {items.map((it) => (
            <div
              key={`${it.kind}-${it.destino.slug}-${it.slug}`}
              className="w-[46%] shrink-0 sm:w-52 lg:w-56"
            >
              <ItemCard item={it} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EmptyState({
  noun,
  onClear,
}: {
  noun: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
      <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        No encontramos {noun} con ese criterio.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
      >
        Limpiar filtros
      </button>
    </div>
  );
}

function Band({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-8">
      <div className="container">
        <header className="mb-4">
          <p className="eyebrow flex items-center gap-2">
            {icon}
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-xl tracking-tight text-foreground sm:text-2xl md:text-3xl">
            {title}
          </h2>
        </header>
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
          {children}
        </div>
      </div>
    </section>
  );
}

function RegionChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}
