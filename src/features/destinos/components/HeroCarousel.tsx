"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Building2,
  Utensils,
  Compass,
  ArrowRight,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useCarousel } from "./useCarousel";

export type HeroSlideType =
  | "atraccion"
  | "atractivo"
  | "hospedaje"
  | "gastronomia";

export interface HeroSlide {
  type: HeroSlideType;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  photoUrl: string;
  /** Destino/ficha de la card. Sin href la card es editorial (no navega). */
  href?: string;
}

const TYPE_META: Record<
  HeroSlideType,
  { label: string; icon: LucideIcon; chip: string }
> = {
  atraccion: { label: "Imperdible", icon: Sparkles, chip: "bg-amber-500/95" },
  atractivo: { label: "Para hacer", icon: Compass, chip: "bg-teal-600/95" },
  hospedaje: { label: "Dónde dormir", icon: Building2, chip: "bg-primary/95" },
  gastronomia: { label: "Para comer", icon: Utensils, chip: "bg-rose-500/95" },
};

interface HeroCarouselProps {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  slides: HeroSlide[];
}

/**
 * Hero carrusel de destacados (fallback cuando no hay promos suficientes):
 * encabezado prominente + track horizontal de slides con estética de card
 * (foto 16/10, chip de tipo, cuerpo con nombre/bajada/CTA). Mecánica en
 * useCarousel. Lo comparten home y página de destino.
 */
export function HeroCarousel({
  eyebrow,
  title,
  subtitle,
  slides,
}: HeroCarouselProps) {
  const { active, scrollToSlide, trackProps } = useCarousel(slides.length);

  if (slides.length === 0) return null;

  return (
    <section
      className="border-b border-border bg-secondary/30 py-10 md:py-14"
      aria-roledescription="carousel"
      aria-label={title}
    >
      <div className="container">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
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
        {slides.map((s, i) => {
          const meta = TYPE_META[s.type];
          const Icon = meta.icon;
          const cardClass =
            "group flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-[22rem] lg:w-[24rem]";
          const body = (
            <>
              <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                <Image
                  src={s.photoUrl}
                  alt={s.nombre}
                  fill
                  sizes="(max-width: 640px) 85vw, 24rem"
                  priority={i === 0}
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
                <span
                  className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${meta.chip}`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {meta.label}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-2xl tracking-tight text-foreground">
                  {s.nombre}
                </h2>
                {s.categoria && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {s.categoria}
                  </p>
                )}
                {s.descripcion && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {s.descripcion}
                  </p>
                )}
                {s.href && (
                  <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                    Conocer más
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                )}
              </div>
            </>
          );
          const common = {
            "data-slide": true,
            "data-idx": i,
            "aria-roledescription": "slide",
            "aria-label": `${i + 1} de ${slides.length}: ${s.nombre}`,
            className: cardClass,
          } as const;
          return s.href ? (
            <Link key={`${s.type}-${s.slug}-${i}`} href={s.href} {...common}>
              {body}
            </Link>
          ) : (
            <div key={`${s.type}-${s.slug}-${i}`} {...common}>
              {body}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="mt-5 flex justify-center gap-2" role="tablist">
          {slides.map((_, i) => (
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
