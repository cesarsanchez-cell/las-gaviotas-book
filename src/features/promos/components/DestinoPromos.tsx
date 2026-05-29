"use client";

import * as React from "react";
import { Tag, BedDouble, UtensilsCrossed, Compass, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/Container";
import { PromoCard } from "@/features/home/components/PromoCard";
import type { PromoPublic } from "@/features/promos/lib/queries";
import type { ComercioTipo } from "@/types/database";

// Toggle de verticales mapeado al comercio_tipo de la promo.
const VERTICALES: Array<{ tipo: ComercioTipo; label: string; icon: LucideIcon }> = [
  { tipo: "hospedaje", label: "Hospedajes", icon: BedDouble },
  { tipo: "gastronomico", label: "Gastronomía", icon: UtensilsCrossed },
  { tipo: "atractivo", label: "Qué hacer", icon: Compass },
];

/**
 * Banda "Promos en {destino}" dentro de la página del destino, con un toggle de
 * vertical. Solo muestra las verticales que tienen promos. Por defecto abre en
 * la primera vertical con promos (priorizando hospedajes).
 *
 * Nota: las sinergias (combos) que cruzan verticales son del bloque 8 — acá solo
 * se muestran promos individuales.
 */
export function DestinoPromos({
  promos,
  destinoNombre,
}: {
  promos: PromoPublic[];
  destinoNombre: string;
}) {
  // Verticales que efectivamente tienen promos, en el orden canónico.
  const disponibles = React.useMemo(
    () => VERTICALES.filter((v) => promos.some((p) => p.comercio.tipo === v.tipo)),
    [promos]
  );

  const [activa, setActiva] = React.useState<ComercioTipo | null>(
    disponibles[0]?.tipo ?? null
  );

  if (promos.length === 0 || disponibles.length === 0 || !activa) return null;

  const visibles = promos.filter((p) => p.comercio.tipo === activa);

  return (
    <section className="border-b border-border bg-secondary/30 py-12 md:py-16">
      <Container size="xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <Tag className="h-4 w-4" aria-hidden />
              Promos en {destinoNombre}
            </p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
              Beneficios que conviene aprovechar
            </h2>
          </div>

          {disponibles.length > 1 && (
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Filtrar promos por categoría"
            >
              {disponibles.map((v) => {
                const Icon = v.icon;
                const active = activa === v.tipo;
                return (
                  <button
                    key={v.tipo}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiva(v.tipo)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
          {visibles.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </div>
      </Container>
    </section>
  );
}
