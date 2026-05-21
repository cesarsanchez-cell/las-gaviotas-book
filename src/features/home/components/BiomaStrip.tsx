import Link from "next/link";
import { Layers } from "lucide-react";
import type { Bioma } from "@/types/database";
import { BiomaIcon, biomaColor, biomaLabel } from "./BiomaIcon";

const BIOMAS_ORDERED: Bioma[] = [
  "playa",
  "bosque",
  "montana",
  "sierra",
  "lago",
  "desierto",
];

export function BiomaStrip() {
  return (
    <section className="bg-secondary/50 py-12">
      <div className="container">
        <header className="mb-6 max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <Layers className="h-4 w-4" aria-hidden />
            Explorá por bioma
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
            El paisaje al que querés ir
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Filtro transversal — no importa la región, te muestra solo destinos
            donde el bioma que elegís es la particularidad de la zona.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {BIOMAS_ORDERED.map((b) => (
            <Link
              key={b}
              href={`/buscar?bioma=${b}`}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 text-white transition hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ backgroundColor: biomaColor(b) }}
            >
              <BiomaIcon bioma={b} size={32} strokeWidth={1.8} />
              <span className="font-display text-base tracking-tight">
                {biomaLabel(b)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
