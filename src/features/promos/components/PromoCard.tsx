"use client";

import Image from "next/image";
import { Tag, MapPin } from "lucide-react";
import type { PromoPublic } from "@/features/promos/lib/queries";

/**
 * Card compacta de promo para el carrusel de "Imperdibles" de la home: mismo
 * tamaño que ComboCard y las cards de los verticales. Es un teaser — el detalle
 * (beneficio, vigencia, WhatsApp) vive en PromoDetailModal, que abre al
 * clickear. El ancho lo fija el contenedor del carrusel.
 */
export function PromoCard({
  promo,
  onOpen,
}: {
  promo: PromoPublic;
  onOpen: (p: PromoPublic) => void;
}) {
  return (
    <article
      onClick={() => onOpen(promo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(promo);
      }}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {promo.comercio.fotoUrl ? (
          <Image
            src={promo.comercio.fotoUrl}
            alt={promo.comercio.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Tag size={40} aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Tag className="h-3 w-3" aria-hidden />
          Promo
        </span>
        {promo.pct && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            -{promo.pct}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-display text-base leading-tight tracking-tight text-foreground">
          {promo.titulo}
        </h3>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          {promo.comercio.nombre} · {promo.destino.nombre}
        </p>
      </div>
    </article>
  );
}
