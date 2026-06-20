"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ComboCard } from "@/features/combos/components/ComboCard";
import { PromoCard } from "@/features/promos/components/PromoCard";
import type { ComboPublic } from "@/features/combos/lib/queries";
import type { PromoPublic } from "@/features/promos/lib/queries";

type ImperdibleItem =
  | { kind: "combo"; key: string; combo: ComboPublic }
  | { kind: "promo"; key: string; promo: PromoPublic };

interface ImperdiblesCarouselProps {
  promos: PromoPublic[];
  combos: ComboPublic[];
  onOpenPromo: (p: PromoPublic) => void;
  onOpenCombo: (c: ComboPublic) => void;
}

/**
 * Carrusel unificado de "Imperdibles": mezcla promos (ofertas) y combos
 * (escapadas armadas) en una sola franja, intercalados, con cards compactas del
 * mismo tamaño (las de los verticales). Cada card abre su propio modal. La
 * mecánica de scroll/flechas es la de CombosCarousel (varias cards visibles, sin
 * "slide activo"): flechas sólo en desktop y sólo si el contenido desborda.
 */
export function ImperdiblesCarousel({
  promos,
  combos,
  onOpenPromo,
  onOpenCombo,
}: ImperdiblesCarouselProps) {
  // Intercalado combo↔promo (arranca por combo: lo más distintivo). Lo que sobra
  // de la lista más larga se agrega al final.
  const items = React.useMemo<ImperdibleItem[]>(() => {
    const cs: ImperdibleItem[] = combos.map((c) => ({
      kind: "combo",
      key: `combo-${c.id}`,
      combo: c,
    }));
    const ps: ImperdibleItem[] = promos.map((p) => ({
      kind: "promo",
      key: `promo-${p.id}`,
      promo: p,
    }));
    const out: ImperdibleItem[] = [];
    const n = Math.max(cs.length, ps.length);
    for (let i = 0; i < n; i++) {
      if (i < cs.length) out.push(cs[i]);
      if (i < ps.length) out.push(ps[i]);
    }
    return out;
  }, [combos, promos]);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = React.useState(false);
  const [canNext, setCanNext] = React.useState(false);
  const [overflowing, setOverflowing] = React.useState(false);

  const measure = React.useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflowing(max > 4);
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);
  }, []);

  React.useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, items.length]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const gap = 20; // sm:gap-5
    const stride = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * stride, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const edge = "max(1rem,calc((100vw-80rem)/2+1rem))";
  const arrowBase =
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md transition hover:bg-card disabled:pointer-events-none disabled:opacity-0 md:flex";

  return (
    <div className="relative mt-6">
      <div
        ref={trackRef}
        onScroll={measure}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it) => (
          <div
            key={it.key}
            data-card
            className="w-[46%] shrink-0 snap-start sm:w-52 lg:w-56 [&>article]:h-full"
          >
            {it.kind === "combo" ? (
              <ComboCard combo={it.combo} onOpen={onOpenCombo} />
            ) : (
              <PromoCard promo={it.promo} onOpen={onOpenPromo} />
            )}
          </div>
        ))}
      </div>

      {overflowing && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            disabled={!canPrev}
            onClick={() => scrollByCards(-1)}
            style={{ left: edge }}
            className={arrowBase}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            disabled={!canNext}
            onClick={() => scrollByCards(1)}
            style={{ right: edge }}
            className={arrowBase}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
