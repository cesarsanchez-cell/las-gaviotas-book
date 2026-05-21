import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Bioma } from "@/types/database";
import {
  BiomaIcon,
  biomaColor,
  biomaLabel,
  biomaIcon,
} from "./BiomaIcon";

interface DestinoCardProps {
  slug: string;
  nombre: string;
  region: string | null;
  pais: string | null;
  descripcion_corta: string | null;
  biomas: Bioma[];
  hospedajes_count: number;
  foto_url: string | null;
}

export function DestinoCard({
  slug,
  nombre,
  region,
  pais,
  descripcion_corta,
  biomas,
  hospedajes_count,
  foto_url,
}: DestinoCardProps) {
  const primary = biomas[0] ?? "playa";
  const secondary = biomas[1] ?? primary;
  const PrimaryIcon = biomaIcon(primary);
  const SecondaryIcon = biomaIcon(secondary);

  return (
    <Link
      href={`/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={
          foto_url
            ? undefined
            : {
                background: `linear-gradient(135deg, ${biomaColor(primary)} 0%, ${biomaColor(secondary)} 100%)`,
              }
        }
      >
        {foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={foto_url}
            alt={nombre}
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute -left-4 -top-4 text-white/15"
            >
              <PrimaryIcon size={140} strokeWidth={1.2} />
            </span>
            {secondary !== primary && (
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-2 right-3 text-white/20"
              >
                <SecondaryIcon size={70} strokeWidth={1.2} />
              </span>
            )}
          </>
        )}

        {/* Chips de biomas en la parte inferior, siempre encima */}
        {biomas.length > 0 && (
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {biomas.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
              >
                <BiomaIcon bioma={b} size={11} />
                {biomaLabel(b)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {(region || pais) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden />
            {[region, pais].filter(Boolean).join(" · ")}
          </p>
        )}
        <h3 className="mt-1.5 font-display text-xl tracking-tight text-foreground">
          {nombre}
        </h3>
        {descripcion_corta && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {descripcion_corta}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{hospedajes_count}</strong>{" "}
            {hospedajes_count === 1
              ? "hospedaje verificado"
              : "hospedajes verificados"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}
