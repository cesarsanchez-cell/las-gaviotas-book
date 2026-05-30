import Link from "next/link";
import Image from "next/image";
import { Sparkles, MapPin, BedDouble, UtensilsCrossed, Compass, type LucideIcon } from "lucide-react";
import { biomaColor, biomaIcon } from "./BiomaIcon";
import type { VerticalItem, VerticalKey } from "@/features/home/lib/queries";

const FALLBACK_ICON: Record<VerticalKey, LucideIcon> = {
  hospedajes: BedDouble,
  gastronomia: UtensilsCrossed,
  atractivos: Compass,
};

/**
 * Card de comercio para la grilla del hub v2. Si no hay foto, cae a un
 * gradiente del bioma del destino + glyph (mismo lenguaje visual que
 * DestinoMiniCard). Click → detalle del comercio puntual
 * (`/{destino}/{kind}/{slug}`); `kind` coincide 1:1 con el segmento de ruta
 * (hospedajes/gastronomia/atractivos). Volver = back del navegador a la home.
 */
export function ItemCard({ item }: { item: VerticalItem }) {
  const primary = item.biomas[0] ?? "playa";
  const secondary = item.biomas[1] ?? primary;
  const FallbackIcon = FALLBACK_ICON[item.kind];
  const BiomaGlyph = biomaIcon(primary);

  return (
    <Link
      href={`/${item.destino.slug}/${item.kind}/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.fotoUrl ? (
          <Image
            src={item.fotoUrl}
            alt={item.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${biomaColor(primary)} 0%, ${biomaColor(secondary)} 100%)`,
            }}
          >
            <span className="text-white/85" aria-hidden>
              <BiomaGlyph size={40} strokeWidth={1.4} />
            </span>
          </div>
        )}
        {item.destacado && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Sparkles className="h-3 w-3" aria-hidden />
            Destacado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start gap-1.5">
          {!item.fotoUrl && (
            <FallbackIcon
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          )}
          <h3 className="font-display text-base leading-tight tracking-tight text-foreground">
            {item.nombre}
          </h3>
        </div>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" aria-hidden />
          {item.destino.nombre}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.tipoLabel}</p>
      </div>
    </Link>
  );
}
