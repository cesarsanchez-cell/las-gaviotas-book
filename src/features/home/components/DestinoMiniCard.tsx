import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Bioma } from "@/types/database";
import { BiomaIcon, biomaColor, biomaLabel, biomaIcon } from "./BiomaIcon";

export interface DestinoMini {
  slug: string;
  nombre: string;
  region: string | null;
  biomas: Bioma[];
  hospedajes_count: number;
  agregadoHace?: string | null;
}

export function DestinoMiniCard({ destino }: { destino: DestinoMini }) {
  const primary = destino.biomas[0] ?? "playa";
  const secondary = destino.biomas[1] ?? primary;
  const PrimaryIcon = biomaIcon(primary);

  return (
    <Link
      href={`/${destino.slug}`}
      className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-56"
    >
      <div
        className="relative aspect-square overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${biomaColor(primary)} 0%, ${biomaColor(secondary)} 100%)`,
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -top-3 text-white/20"
        >
          <PrimaryIcon size={90} strokeWidth={1.2} />
        </span>
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
          <BiomaIcon bioma={primary} size={10} />
          {biomaLabel(primary)}
        </span>
        {destino.agregadoHace && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            <Sparkles className="h-3 w-3" />
            Nuevo · {destino.agregadoHace}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-base tracking-tight text-foreground">
          {destino.nombre}
        </p>
        {destino.region && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {destino.region}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {destino.hospedajes_count} hospedaje
          {destino.hospedajes_count === 1 ? "" : "s"}
        </p>
      </div>
    </Link>
  );
}
