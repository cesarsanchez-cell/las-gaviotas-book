import Link from "next/link";
import Image from "next/image";
import { Tag, MapPin } from "lucide-react";
import type { PromoPublic } from "@/features/promos/lib/queries";

/**
 * Card de promo para las bandas de la home. La foto se hereda del comercio
 * referenciado. Click → portal del destino del comercio.
 */
export function PromoCard({ promo }: { promo: PromoPublic }) {
  return (
    <Link
      href={`/${promo.destino.slug}`}
      className="group flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-64"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {promo.comercio.fotoUrl ? (
          <Image
            src={promo.comercio.fotoUrl}
            alt={promo.comercio.nombre}
            fill
            sizes="256px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Tag size={36} aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Tag className="h-3 w-3" aria-hidden />
          Promo
        </span>
        {promo.pct && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
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
        {promo.bajada && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {promo.bajada}
          </p>
        )}
      </div>
    </Link>
  );
}
