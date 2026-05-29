"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Store, LocateFixed, MapPinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { AirbnbTop } from "./AirbnbTop";
import { SearchPanel } from "./SearchPanel";
import { ItemCard } from "./ItemCard";
import { DestinoMiniCard, type DestinoMini } from "./DestinoMiniCard";
import {
  EMPTY_SEARCH,
  VERTICAL_TITLE,
  VERTICAL_NOUN,
  type SearchState,
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

export function HubV2({ verticalData, destinos, regiones, session }: HubV2Props) {
  const [vertical, setVertical] = React.useState<VerticalKey>("hospedajes");
  const [search, setSearch] = React.useState<SearchState>(EMPTY_SEARCH);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [regionFilter, setRegionFilter] = React.useState<string | null>(null);
  const [geo, setGeo] = React.useState<GeoState>("idle");
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);

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

  // Grilla del vertical activo, filtrada por región, dónde y tipo.
  const items = React.useMemo(() => {
    let all = verticalData[vertical] ?? [];
    if (regionFilter) {
      const region = regiones.find((r) => r.slug === regionFilter);
      const allowed = new Set(region?.destinos_slugs ?? []);
      all = all.filter((it) => allowed.has(it.destino.slug));
    }
    if (dondeSlugs) {
      all = all.filter((it) => dondeSlugs.has(it.destino.slug));
    }
    if (vertical !== "hospedajes" && search.tipo) {
      all = all.filter((it) => it.tipoLabel === search.tipo);
    }
    return all;
  }, [verticalData, vertical, regionFilter, dondeSlugs, search.tipo, regiones]);

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
    setVertical("hospedajes");
    setRegionFilter(null);
    setSearch(EMPTY_SEARCH);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showNearbyBand = !hasDonde && geo === "granted" && nearby.length > 0;
  const showRegionChips = !hasDonde && regiones.length > 1;

  return (
    <>
      <AirbnbTop
        vertical={vertical}
        onChangeVertical={setVertical}
        onGoHub={goHub}
        search={search}
        onOpenSearch={() => setSearchOpen(true)}
        session={session}
      />

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        search={search}
        onApply={setSearch}
        destinos={destinos}
        regiones={regiones}
        vertical={vertical}
        onUseGeo={askGeo}
      />

      <main className="pb-16">
        {/* Banda contextual "Cerca tuyo" (con geo). Sin promos cargadas todavía,
            no se muestra banda de promos. */}
        {showNearbyBand && (
          <section className="border-b border-border py-8">
            <div className="container">
              <header className="mb-4">
                <p className="eyebrow flex items-center gap-2">
                  <LocateFixed className="h-4 w-4" aria-hidden />
                  Cerca tuyo
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-tight text-foreground md:text-3xl">
                  Escapadas a pocas horas
                </h2>
              </header>
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
                {nearby.map((d) => (
                  <DestinoMiniCard key={d.slug} destino={d} />
                ))}
              </div>
            </div>
          </section>
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

        {/* Grilla del vertical activo */}
        <section className="py-8">
          <div className="container">
            <header className="mb-5 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl tracking-tight text-foreground md:text-3xl">
                {VERTICAL_TITLE[vertical]}
                {hasDonde ? ` en ${search.donde}` : ""}
              </h2>
              <span className="shrink-0 text-sm text-muted-foreground">
                {items.length} resultado{items.length === 1 ? "" : "s"}
              </span>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
                <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  No encontramos {VERTICAL_NOUN[vertical]} con ese criterio.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRegionFilter(null);
                    setSearch(EMPTY_SEARCH);
                  }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((it) => (
                  <ItemCard key={`${it.kind}-${it.destino.slug}-${it.slug}`} item={it} />
                ))}
              </div>
            )}
          </div>
        </section>

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
    </>
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
