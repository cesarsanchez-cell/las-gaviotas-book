"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Store, LocateFixed, MapPinOff, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { AirbnbTop } from "./AirbnbTop";
import { SearchPanel } from "./SearchPanel";
import { ItemCard } from "./ItemCard";
import { PromoCard } from "./PromoCard";
import { DestinoMiniCard, type DestinoMini } from "./DestinoMiniCard";
import { ComboCard } from "@/features/combos/components/ComboCard";
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

interface HubV2Props {
  verticalData: Record<VerticalKey, VerticalItem[]>;
  destinos: DestinoPublicadoLite[];
  regiones: RegionVisible[];
  promos: PromoPublic[];
  combos: ComboPublic[];
  session: HeaderSession;
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
}: HubV2Props) {
  // La tab "Promos" mezcla combos (promociones combinadas) + promos individuales.
  const hasOfertas = promos.length > 0 || combos.length > 0;
  const defaultTab: HubTab = hasOfertas ? "promos" : "hospedajes";
  const [tab, setTab] = React.useState<HubTab>(defaultTab);
  const [search, setSearch] = React.useState<SearchState>(EMPTY_SEARCH);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [geo, setGeo] = React.useState<GeoState>("idle");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [comboSel, setComboSel] = React.useState<ComboPublic | null>(null);

  // Persistimos la tab activa en la URL (?v=) con history.replaceState — sin
  // disparar navegación de Next. Así, al entrar a un comercio y volver con el
  // back del navegador, la home reabre en la misma vertical donde estabas.
  const changeTab = React.useCallback(
    (next: HubTab) => {
      setTab(next);
      const params = new URLSearchParams(window.location.search);
      if (next === defaultTab) params.delete("v");
      else params.set("v", next);
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      );
    },
    [defaultTab]
  );

  // Al montar (incluido el back del navegador), recuperamos la tab de la URL.
  React.useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    if (v === "promos" || v === "hospedajes" || v === "gastronomia" || v === "atractivos") {
      setTab(v as HubTab);
    }
  }, []);

  const hasDonde = Boolean(search.donde.trim());

  // Slugs de destino permitidos por el "dónde" (matchea destino o región).
  const dondeSlugs = React.useMemo(() => {
    if (!hasDonde) return null;
    const q = search.donde.toLowerCase();
    const set = new Set<string>();
    for (const d of destinos) {
      if (d.nombre.toLowerCase().includes(q)) set.add(d.slug);
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

  // Grilla de la vertical activa (cuando no es la tab Promos).
  const items = React.useMemo(() => {
    if (tab === "promos") return [];
    let all = verticalData[tab] ?? [];
    if (allowedSlugs) all = all.filter((it) => allowedSlugs.has(it.destino.slug));
    if (tab !== "hospedajes" && search.tipo) {
      all = all.filter((it) => it.tipoLabel === search.tipo);
    }
    return all;
  }, [verticalData, tab, allowedSlugs, search.tipo]);

  // Promos visibles (tab Promos), filtradas por región + dónde.
  const promosVisibles = React.useMemo(() => {
    if (!allowedSlugs) return promos;
    return promos.filter((p) => allowedSlugs.has(p.destino.slug));
  }, [promos, allowedSlugs]);

  // Combos visibles (mismos filtros). Van arriba de las promos en la tab Promos.
  const combosVisibles = React.useMemo(() => {
    if (!allowedSlugs) return combos;
    return combos.filter((c) => allowedSlugs.has(c.destinoSlug));
  }, [combos, allowedSlugs]);

  const ofertasCount = combosVisibles.length + promosVisibles.length;

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
    changeTab(defaultTab);
    setRegionFilter(null);
    setSearch(EMPTY_SEARCH);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showNearby = geo === "granted" && nearby.length > 0;
  const showRegionChips = regiones.length > 1;
  // Armador es por-destino: con un solo destino tenemos target claro. Con
  // varios, el CTA vive en cada página de destino (TODO multi-destino: elegir
  // destino antes de armar).
  const singleDestino = destinos.length === 1 ? destinos[0] : null;

  return (
    <>
      <AirbnbTop
        vertical={tab}
        onChangeVertical={changeTab}
        onGoHub={goHub}
        search={search}
        onOpenSearch={() => setSearchOpen(true)}
        session={session}
        showPromos={hasOfertas}
      />

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={search}
        onApply={setSearch}
        destinos={destinos}
        regiones={regiones}
        vertical={tab}
        onUseGeo={askGeo}
      />

      <main className="pb-16">
        {/* Cercanos (geolocalización). El resto del contenido es el de la tab. */}
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

        {/* Contenido de la tab activa */}
        {tab === "promos" ? (
          <section className="py-8">
            <div className="container">
              <header className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow flex items-center gap-2">
                    <Tag className="h-4 w-4" aria-hidden />
                    Promos
                  </p>
                  <h2 className="mt-1 font-display text-xl tracking-tight text-foreground sm:text-2xl md:text-3xl">
                    Lo que conviene ahora
                    {hasDonde ? ` en ${search.donde}` : ""}
                  </h2>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {ofertasCount} promo{ofertasCount === 1 ? "" : "s"}
                </span>
              </header>

              {ofertasCount === 0 ? (
                <EmptyState
                  noun="promos"
                  onClear={() => {
                    setRegionFilter(null);
                    setSearch(EMPTY_SEARCH);
                  }}
                />
              ) : (
                <div className="space-y-6">
                  {/* Combos (promociones combinadas) primero — el plus "solo acá". */}
                  {combosVisibles.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {combosVisibles.map((c) => (
                        <ComboCard key={c.id} combo={c} onOpen={setComboSel} />
                      ))}
                    </div>
                  )}
                  {/* Promos individuales debajo. */}
                  {promosVisibles.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {promosVisibles.map((p) => (
                        <PromoCard key={p.id} promo={p} widthClass="w-full" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Armá la tuya — con un solo destino, target directo. */}
              {singleDestino && (
                <div className="mt-6">
                  <ArmadorCTA
                    compact
                    destinoSlug={singleDestino.slug}
                    destinoNombre={singleDestino.nombre}
                  />
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="py-8">
            <div className="container">
              <header className="mb-5 flex items-end justify-between gap-4">
                <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  {VERTICAL_TITLE[tab as VerticalKey]}
                  {hasDonde ? ` en ${search.donde}` : ""}
                </h2>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {items.length} resultado{items.length === 1 ? "" : "s"}
                </span>
              </header>

              {items.length === 0 ? (
                <EmptyState
                  noun={VERTICAL_NOUN[tab as VerticalKey]}
                  onClear={() => {
                    setRegionFilter(null);
                    setSearch(EMPTY_SEARCH);
                  }}
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {items.map((it) => (
                    <ItemCard key={`${it.kind}-${it.destino.slug}-${it.slug}`} item={it} />
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
    </>
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
