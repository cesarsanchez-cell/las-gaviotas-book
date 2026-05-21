"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, MapPin, LocateFixed, Map as MapIcon } from "lucide-react";
import { BiomaIcon } from "./BiomaIcon";
import type { Bioma } from "@/types/database";

interface DestinoLite {
  slug: string;
  nombre: string;
  region: string | null;
  pais: string | null;
}

interface SearchHeroProps {
  destinos: DestinoLite[];
}

const QUICK_BIOMAS: Bioma[] = ["playa", "bosque", "sierra", "lago"];

export function SearchHero({ destinos }: SearchHeroProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return destinos
      .filter((d) => d.nombre.toLowerCase().includes(term))
      .slice(0, 6);
  }, [q, destinos]);

  return (
    <section className="relative overflow-hidden bg-background pt-12 pb-16 md:pt-20 md:pb-24">
      <div className="container relative">
        {/* Botón vista mapa (top-right) */}
        <Link
          href="/mapa"
          className="absolute right-0 top-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary"
        >
          <MapIcon className="h-3.5 w-3.5" />
          Vista mapa
        </Link>

        <header className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <MapPin
              className="h-4 w-4"
              style={{ color: "hsl(var(--wm-mis))" }}
              aria-hidden
            />
            Mis Escapadas — Red de portales locales
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl">
            ¿A dónde te querés escapar?
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            Hospedajes verificados por la comunidad de cada destino. Sin
            intermediarios, sin comisiones.
          </p>
        </header>

        {/* Buscador */}
        <div className="relative mt-8 max-w-2xl">
          <div
            className={`flex items-center gap-3 rounded-full border bg-card px-5 py-3 shadow-sm transition ${
              focused
                ? "border-primary ring-2 ring-primary/20"
                : "border-border"
            }`}
          >
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            <input
              type="search"
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none md:text-base"
              placeholder="Buscar destino  ·  ej: Las Gaviotas, Bariloche, Cafayate…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              aria-label="Buscar destino"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Limpiar"
                className="text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {focused && matches.length > 0 && (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              {matches.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onMouseDown={() => router.push(`/${d.slug}`)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-secondary"
                >
                  <MapPin
                    className="h-4 w-4 shrink-0"
                    style={{ color: "hsl(var(--wm-mis))" }}
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {d.nombre}
                    </span>
                    {(d.region || d.pais) && (
                      <span className="text-xs text-muted-foreground">
                        {[d.region, d.pais].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pills rápidas */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/buscar?cerca=1"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Cerca mío
          </Link>
          {QUICK_BIOMAS.map((b) => (
            <Link
              key={b}
              href={`/buscar?bioma=${b}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <BiomaIcon bioma={b} size={14} />
              {b === "playa"
                ? "Playa"
                : b === "bosque"
                  ? "Bosque"
                  : b === "sierra"
                    ? "Sierras"
                    : "Lago"}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
