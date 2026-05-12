"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { getFotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface GalleryFoto {
  id: string;
  storage_path: string;
  alt?: string | null;
  width: number;
  height: number;
}

interface HospedajeGalleryProps {
  fotos: GalleryFoto[];
  hospedajeNombre: string;
  className?: string;
}

export function HospedajeGallery({
  fotos,
  hospedajeNombre,
  className,
}: HospedajeGalleryProps) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  const total = fotos.length;

  const close = React.useCallback(() => setOpen(false), []);
  const prev = React.useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total]
  );
  const next = React.useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, prev, next]);

  if (total === 0) return null;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      {/* Grid principal — hero grande + thumbs en desktop, scroll horizontal mobile */}
      <div className={cn("relative", className)}>
        {/* Mobile: scroll horizontal */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:hidden">
          {fotos.map((foto, i) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => openAt(i)}
              className="relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-lg bg-muted"
              aria-label={`Foto ${i + 1} de ${total}`}
            >
              <Image
                src={getFotoUrl(foto.storage_path)}
                alt={foto.alt ?? hospedajeNombre}
                fill
                sizes="85vw"
                priority={i === 0}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {/* Desktop: grid 2 columnas */}
        <div className="hidden md:grid md:grid-cols-4 md:gap-2">
          <button
            type="button"
            onClick={() => openAt(0)}
            className="relative col-span-2 row-span-2 aspect-[4/3] overflow-hidden rounded-l-xl bg-muted"
            aria-label="Foto principal"
          >
            <Image
              src={getFotoUrl(fotos[0].storage_path)}
              alt={fotos[0].alt ?? hospedajeNombre}
              fill
              sizes="50vw"
              priority
              className="object-cover transition-transform hover:scale-105"
            />
          </button>
          {fotos.slice(1, 5).map((foto, i) => {
            const isLast = i === 3;
            const isCornerTopRight = i === 1;
            const isCornerBottomRight = i === 3;
            return (
              <button
                key={foto.id}
                type="button"
                onClick={() => openAt(i + 1)}
                className={cn(
                  "relative aspect-square overflow-hidden bg-muted",
                  isCornerTopRight && "rounded-tr-xl",
                  isCornerBottomRight && "rounded-br-xl"
                )}
                aria-label={`Foto ${i + 2} de ${total}`}
              >
                <Image
                  src={getFotoUrl(foto.storage_path)}
                  alt={foto.alt ?? hospedajeNombre}
                  fill
                  sizes="25vw"
                  className="object-cover transition-transform hover:scale-105"
                />
                {isLast && total > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-base font-medium text-white">
                    +{total - 5} fotos
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${hospedajeNombre}`}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Cerrar galería"
          >
            <X className="h-6 w-6" />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                aria-label="Foto siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="relative h-[80vh] w-[90vw] max-w-5xl">
            <Image
              src={getFotoUrl(fotos[index].storage_path)}
              alt={fotos[index].alt ?? hospedajeNombre}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {index + 1} / {total}
          </div>
        </div>
      )}
    </>
  );
}
