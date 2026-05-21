import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Bioma } from "@/types/database";
import {
  BiomaIcon,
  biomaColor,
  biomaLabel,
  biomaIcon,
} from "./BiomaIcon";

interface RegionCardProps {
  slug: string;
  nombre: string;
  descripcion: string | null;
  biomas: Bioma[];
  destinos_count: number;
}

export function RegionCard({
  slug,
  nombre,
  descripcion,
  biomas,
  destinos_count,
}: RegionCardProps) {
  const primary = biomas[0] ?? "playa";
  const secondary = biomas[1] ?? primary;
  const PrimaryIcon = biomaIcon(primary);
  const SecondaryIcon = biomaIcon(secondary);

  return (
    <Link
      href={`/regiones/${slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${biomaColor(primary)} 0%, ${biomaColor(secondary)} 100%)`,
        }}
      >
        {/* Glyph principal (grande, esquina sup-izq) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-4 -top-4 text-white/15"
        >
          <PrimaryIcon size={140} strokeWidth={1.2} />
        </span>
        {/* Glyph secundario (chico, esquina inf-der) */}
        {secondary !== primary && (
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-2 right-3 text-white/20"
          >
            <SecondaryIcon size={70} strokeWidth={1.2} />
          </span>
        )}

        {/* Chips de biomas en la parte inferior */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {biomas.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
            >
              <BiomaIcon bioma={b} size={11} />
              {biomaLabel(b)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl tracking-tight text-foreground">
          {nombre}
        </h3>
        {descripcion && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {descripcion}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-4 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{destinos_count}</strong>{" "}
            {destinos_count === 1 ? "destino" : "destinos"}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </div>
    </Link>
  );
}
