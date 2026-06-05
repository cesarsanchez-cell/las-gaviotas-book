"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ComboCard } from "./ComboCard";
import type { ComboPublic } from "@/features/combos/lib/queries";

interface CombosCarouselProps {
  combos: ComboPublic[];
  onOpen: (c: ComboPublic) => void;
}

/**
 * Banda de combos ("escapadas armadas") como carrusel scroll-snap. Antes era un
 * grid de 2 columnas: en PC cada ComboCard (densa) ocupaba media pantalla y no
 * había nada que navegar. Acá las cards tienen ancho acotado y el track sangra a
 * todo el ancho alineando al contenedor de 80rem (igual que PromosHero), pero a
 * diferencia de los hero NO usa useCarousel: los combos muestran varias cards a
 * la vez, así que el "slide activo" por IntersectionObserver no aplica. El estado
 * de las flechas se deriva de la posición real de scroll, y la navegación
 * (flechas) sólo aparece en desktop y sólo si el contenido desborda — si todo
 * entra en pantalla es una fila simple, sin controles fantasma.
 */
export function CombosCarousel({ combos, onOpen }: CombosCarouselProps) {
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
  }, [measure, combos.length]);

  const scrollByCards = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const gap = 20; // sm:gap-5
    const stride = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * stride, behavior: "smooth" });
  };

  if (combos.length === 0) return null;

  // Borde del contenedor de 80rem: alinea cards y flechas con el resto de la home.
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
        {combos.map((c) => (
          <div
            key={c.id}
            data-card
            className="w-[88%] shrink-0 snap-start sm:w-[24rem] lg:w-[26rem] [&>article]:h-full"
          >
            <ComboCard combo={c} onOpen={onOpen} />
          </div>
        ))}
      </div>

      {overflowing && (
        <>
          {/* Flechas: sólo desktop. En móvil se navega con swipe (la card vecina
              asoma como pista de que hay más). */}
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
