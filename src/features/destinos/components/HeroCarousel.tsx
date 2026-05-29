"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Building2,
  Utensils,
  ArrowRight,
  CalendarSearch,
  type LucideIcon,
} from "lucide-react";

export type HeroSlideType = "atractivo" | "hospedaje" | "gastronomia";

export interface HeroSlide {
  type: HeroSlideType;
  slug: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  photoUrl: string;
  href: string;
}

const TYPE_META: Record<
  HeroSlideType,
  { label: string; icon: LucideIcon; chip: string }
> = {
  atractivo: { label: "Imperdible", icon: Sparkles, chip: "bg-amber-500/90" },
  hospedaje: { label: "Dónde dormir", icon: Building2, chip: "bg-primary/90" },
  gastronomia: { label: "Para comer", icon: Utensils, chip: "bg-rose-500/90" },
};

interface HeroCarouselProps {
  nombre: string;
  region: string | null;
  pais: string | null;
  descripcionCorta: string | null;
  slides: HeroSlide[];
  searchHref: string;
}

/**
 * Hero emocional del destino: carrusel scroll-snap (mobile-first) que mezcla
 * imperdibles, hospedajes destacados y gastronomía. Dots sincronizados por
 * IntersectionObserver, auto-advance cada 6s con pausa al hover/touch. El
 * buscador queda como CTA secundario al pie.
 */
export function HeroCarousel({
  nombre,
  region,
  pais,
  descripcionCorta,
  slides,
  searchHref,
}: HeroCarouselProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // Sincronizar el dot activo con la posición de scroll.
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const els = track.querySelectorAll<HTMLElement>("[data-slide]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.intersectionRatio > 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root: track, threshold: [0.6] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [slides.length]);

  // Auto-advance.
  React.useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (active + 1) % slides.length;
      track
        .querySelector<HTMLElement>(`[data-idx="${next}"]`)
        ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, 6000);
    return () => clearInterval(id);
  }, [active, paused, slides.length]);

  function goTo(idx: number) {
    trackRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <section
      className="bg-slate-950 text-white"
      aria-roledescription="carousel"
      aria-label={`Imperdibles de ${nombre}`}
    >
      <div className="container pt-10 md:pt-14">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-300">
          {[region, pais].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-tight drop-shadow-lg md:text-7xl">
          {nombre}
        </h1>
        {descripcionCorta && (
          <p className="mt-4 max-w-2xl text-lg text-white/80 md:text-xl">
            {descripcionCorta}
          </p>
        )}
      </div>

      <div
        ref={trackRef}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        {slides.map((s, i) => {
          const meta = TYPE_META[s.type];
          const Icon = meta.icon;
          return (
            <article
              key={`${s.type}-${s.slug}-${i}`}
              data-slide
              data-idx={i}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${slides.length}: ${s.nombre}`}
              className="relative aspect-[4/5] w-[88%] shrink-0 snap-start overflow-hidden rounded-2xl sm:aspect-[16/10] sm:w-[78%] lg:w-[68%]"
            >
              <Image
                src={s.photoUrl}
                alt={s.nombre}
                fill
                sizes="(max-width: 640px) 88vw, 70vw"
                priority={i === 0}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/30" />

              <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-8">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${meta.chip}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {meta.label}
                  </span>
                  {s.categoria && (
                    <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                      {s.categoria}
                    </span>
                  )}
                </div>

                <div className="max-w-xl">
                  <h2 className="font-display text-3xl tracking-tight drop-shadow md:text-4xl">
                    {s.nombre}
                  </h2>
                  {s.descripcion && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/85 md:text-base">
                      {s.descripcion}
                    </p>
                  )}
                  <Link
                    href={s.href}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white/90"
                  >
                    Conocer más
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="mt-4 flex justify-center gap-2" role="tablist">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`Ir al slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                active === i ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}

      <div className="container flex justify-center pb-10 pt-8 md:pb-14">
        <Link
          href={searchHref}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:bg-primary/90"
        >
          <CalendarSearch className="h-4 w-4" aria-hidden />
          Buscar fechas y disponibilidad
        </Link>
      </div>
    </section>
  );
}
