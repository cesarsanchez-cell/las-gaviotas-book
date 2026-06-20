import Link from "next/link";
import Image from "next/image";
import { Compass, MapPin, Sparkles } from "lucide-react";
import type { ZonaCard } from "@/features/zonas/lib/queries";

interface ConoceLaZonaBandProps {
  zonas: ZonaCard[];
}

/**
 * Banda "Conocé la zona": carrusel horizontal de zonas curadas que linkean a su
 * landing pública (/zona/[slug]). Orienta y da entrada SEO a las atracciones.
 * Presentacional puro; los datos los arman las queries públicas de zona.
 */
export function ConoceLaZonaBand({ zonas }: ConoceLaZonaBandProps) {
  if (zonas.length === 0) return null;

  return (
    <section className="border-b border-border py-10 md:py-14">
      <div className="container">
        <header className="max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <Compass className="h-4 w-4" aria-hidden />
            Conocé la zona
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight text-foreground md:text-3xl">
            Lo que tenés alrededor
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pueblos, playas y bosques que se viven en conjunto. Mirá qué hay para
            descubrir cerca.
          </p>
        </header>
      </div>

      <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden">
        {zonas.map((z) => (
          <Link
            key={z.slug}
            href={`/zona/${z.slug}`}
            className="group flex w-[85%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md sm:w-[22rem] lg:w-[24rem]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
              {z.fotoUrl ? (
                <Image
                  src={z.fotoUrl}
                  alt={z.nombre}
                  fill
                  sizes="(max-width: 640px) 85vw, 24rem"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <MapPin className="h-8 w-8" aria-hidden />
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-600/95 px-2.5 py-1 text-[11px] font-semibold text-white">
                <Sparkles className="h-3 w-3" aria-hidden />
                {z.atraccionesCount} imperdible{z.atraccionesCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-display text-xl tracking-tight text-foreground">
                {z.nombre}
              </h3>
              {z.descripcion && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {z.descripcion}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
