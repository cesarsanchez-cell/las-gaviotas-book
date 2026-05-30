"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ComboCard } from "./ComboCard";
import { ComboDetailModal } from "./ComboDetailModal";
import type { ComboPublic } from "@/features/combos/lib/queries";

/**
 * Sección "Escapadas armadas" de la página del destino: combos curados con card
 * + modal de detalle. No se renderiza si no hay combos publicados.
 *
 * Nota: el CTA al Armador (armado a medida) es el bloque 9 — acá no va.
 */
export function CombosSection({
  combos,
  destinoNombre,
}: {
  combos: ComboPublic[];
  destinoNombre: string;
}) {
  const [selected, setSelected] = React.useState<ComboPublic | null>(null);

  if (combos.length === 0) return null;

  return (
    <section className="bg-secondary/30 py-16 md:py-24" id="combos">
      <Container size="xl">
        <header className="mb-10 max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Escapadas armadas
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
            Lo que sólo conseguís acá
          </h2>
          <p className="mt-2 text-muted-foreground">
            Los comerciantes de {destinoNombre} arman combos juntos — hospedaje,
            mesa y experiencia en una sola propuesta, con beneficios que no existen
            por separado.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {combos.map((c) => (
            <ComboCard key={c.id} combo={c} onOpen={setSelected} />
          ))}
        </div>
      </Container>

      {selected && (
        <ComboDetailModal combo={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
