"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface Foto {
  storage_path: string;
  alt: string | null;
  es_principal?: boolean;
}

interface Props {
  fotos: Foto[];
  unidadNombre: string;
}

/**
 * Carrousel con thumbnails inferiores para la galería de un tipo de unidad.
 * Usa embla-carousel-react. Si solo hay una foto, no muestra controles.
 */
export function UnidadGallery({ fotos, unidadNombre }: Props) {
  const [mainRef, mainApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [thumbRef, thumbApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
    align: "start",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!mainApi) return;
    const idx = mainApi.selectedScrollSnap();
    setSelectedIndex(idx);
    thumbApi?.scrollTo(idx);
  }, [mainApi, thumbApi]);

  useEffect(() => {
    if (!mainApi) return;
    onSelect();
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);
    return () => {
      mainApi.off("select", onSelect);
      mainApi.off("reInit", onSelect);
    };
  }, [mainApi, onSelect]);

  const scrollTo = (idx: number) => mainApi?.scrollTo(idx);
  const prev = () => mainApi?.scrollPrev();
  const next = () => mainApi?.scrollNext();

  if (fotos.length === 0) {
    const placeholder = getFotoUrl("placeholders/apart-1.jpg");
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
        <Image
          src={placeholder}
          alt={unidadNombre}
          fill
          sizes="(max-width: 1024px) 100vw, 800px"
          className="object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="overflow-hidden rounded-2xl" ref={mainRef}>
          <div className="flex">
            {fotos.map((f, i) => (
              <div
                key={f.storage_path}
                className="relative aspect-[4/3] w-full shrink-0 grow-0 basis-full bg-muted"
              >
                <Image
                  src={getFotoUrl(f.storage_path)}
                  alt={f.alt ?? `${unidadNombre} — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={selectedIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={selectedIndex === fotos.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow-md transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 right-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-md">
              {selectedIndex + 1} / {fotos.length}
            </div>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <div className="overflow-hidden" ref={thumbRef}>
          <div className="flex gap-2">
            {fotos.map((f, i) => (
              <button
                key={`thumb-${f.storage_path}`}
                type="button"
                onClick={() => scrollTo(i)}
                className={cn(
                  "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md bg-muted transition",
                  selectedIndex === i
                    ? "ring-2 ring-primary"
                    : "opacity-70 hover:opacity-100"
                )}
                aria-label={`Ir a foto ${i + 1}`}
              >
                <Image
                  src={getFotoUrl(f.storage_path)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
