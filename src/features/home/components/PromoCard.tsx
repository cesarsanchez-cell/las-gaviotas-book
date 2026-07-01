"use client";

import Image from "next/image";
import { Tag, MapPin, Check, ArrowRight } from "lucide-react";
import type { PromoPublic } from "@/features/promos/lib/queries";

/**
 * Card de promo individual (un comercio). La foto se hereda del comercio. El
 * click abre el modal de detalle (no navega): mismo patrón que ComboCard, para
 * que combos y promos se sientan iguales. `widthClass` controla el ancho según
 * el contenedor: strip horizontal (default) o grilla full-width.
 */
export function PromoCard({
  promo,
  onOpen,
  widthClass = "w-64 shrink-0 sm:w-72",
}: {
  promo: PromoPublic;
  onOpen: (p: PromoPublic) => void;
  widthClass?: string;
}) {
  return (
    <article
      onClick={() => onOpen(promo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(promo);
      }}
      className={`group flex ${widthClass} cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {promo.comercio.fotoUrl ? (
          <Image
            src={promo.comercio.fotoUrl}
            alt={promo.comercio.nombre}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
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
        {promo.pct && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            -{promo.pct}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-2xl tracking-tight text-foreground">
          {promo.titulo}
        </h3>
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {promo.comercio.nombre} · {promo.destino.nombre}
        </p>
        {promo.bajada && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {promo.bajada}
          </p>
        )}

        <p className="mt-4 inline-flex items-start gap-2 text-sm text-foreground">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          {promo.beneficio}
        </p>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(promo);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Ver detalle
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
