"use client";

import Image from "next/image";
import { Tag, MapPin, ArrowRight } from "lucide-react";
import { useCarousel } from "@/features/destinos/components/useCarousel";
import type { PromoPublic } from "@/features/promos/lib/queries";

interface PromosHeroProps {
  promos: PromoPublic[];
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  onOpen: (p: PromoPublic) => void;
}

/**
 * Hero carrusel de promos: ocupa la franja superior (la de máxima atención) con
 * las ofertas vigentes. Misma mecánica/estética que el HeroCarousel de
 * destacados, pero las cards abren el modal de la promo (no navegan). Se usa
 * cuando hay suficientes promos; si no, la página cae al hero de destacados.
 */
export function PromosHero({
  promos,
  eyebrow,
  title,
  subtitle,
  onOpen,
}: PromosHeroProps) {
  const { active, scrollToSlide, trackProps } = useCarousel(promos.length);

  if (promos.length === 0) return null;

  return (
    <section
      className="border-b border-border bg-secondary/30 py-10 md:py-14"
      aria-roledescription="carousel"
      aria-label={title}
    >
      <div className="container">
        <p className="eyebrow flex items-center gap-2">
          <Tag className="h-4 w-4" aria-hidden />
          {eyebrow ?? "Promos"}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-foreground md:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        )}
      </div>

      <div
        {...trackProps}
        className="relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden"
      >
        {promos.map((p, i) => (
          <article
            key={p.id}
            data-slide
            data-idx={i}
            role="button"
            tabIndex={0}
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${promos.length}: ${p.titulo}`}
            onClick={() => onOpen(p)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onOpen(p);
            }}
            className="group flex w-[85%] shrink-0 cursor-pointer snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-[22rem] lg:w-[24rem]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              {p.comercio.fotoUrl ? (
                <Image
                  src={p.comercio.fotoUrl}
                  alt={p.comercio.nombre}
                  fill
                  sizes="(max-width: 640px) 85vw, 24rem"
                  priority={i === 0}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Tag size={40} aria-hidden />
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary">
                <Tag className="h-3 w-3" aria-hidden />
                Promo
              </span>
              {p.pct && (
                <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                  -{p.pct}%
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-display text-2xl tracking-tight text-foreground">
                {p.titulo}
              </h2>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {p.comercio.nombre} · {p.destino.nombre}
              </p>
              {p.bajada && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {p.bajada}
                </p>
              )}
              <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Ver promo
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
            </div>
          </article>
        ))}
      </div>

      {promos.length > 1 && (
        <div className="mt-5 flex justify-center gap-2" role="tablist">
          {promos.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Ir al slide ${i + 1}`}
              onClick={() => scrollToSlide(i)}
              className={`h-2 rounded-full transition-all ${
                active === i
                  ? "w-6 bg-primary"
                  : "w-2 bg-border hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
