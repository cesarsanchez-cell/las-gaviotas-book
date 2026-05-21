import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Flame, Sparkles, MapPinned } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { listActiveDestinosWithCounts } from "@/features/hospedajes/lib/queries";
import {
  listRegionesPublicas,
  listDestinosMini,
} from "@/features/regiones/lib/queries";
import { siteConfig } from "@/config/site";
import { SearchHero } from "@/features/home/components/SearchHero";
import { RegionCard } from "@/features/home/components/RegionCard";
import { BiomaStrip } from "@/features/home/components/BiomaStrip";
import {
  DestinoMiniCard,
  type DestinoMini,
} from "@/features/home/components/DestinoMiniCard";
import { NearbyBlock } from "@/features/home/components/NearbyBlock";

export const metadata: Metadata = {
  title: "Mis Escapadas — Red de portales turísticos locales",
  description:
    "Hospedajes verificados por la comunidad de cada destino. Reservá directo con el dueño, sin intermediarios.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mis Escapadas — Red de portales turísticos locales",
    description:
      "Cada destino con su propio portal, hospedajes validados por la comunidad local.",
    url: "/",
    type: "website",
  },
};

function formatHaceTiempo(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const dias = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 14) return `hace ${dias} días`;
  const semanas = Math.floor(dias / 7);
  if (semanas < 6) return `hace ${semanas} semana${semanas === 1 ? "" : "s"}`;
  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
}

export default async function HubPage() {
  const [destinosFull, regiones, destinosMini] = await Promise.all([
    listActiveDestinosWithCounts(),
    listRegionesPublicas(),
    listDestinosMini(),
  ]);

  // Para el buscador, solo necesitamos slug + nombre + region + país.
  const destinosLite = destinosFull.map((d) => ({
    slug: d.slug,
    nombre: d.nombre,
    region: d.region,
    pais: d.pais,
  }));

  // Trending: simple MVP — los que tienen más hospedajes publicados primero.
  const trending: DestinoMini[] = [...destinosMini]
    .sort((a, b) => b.hospedajes_count - a.hospedajes_count)
    .slice(0, 6)
    .map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      region: d.region_label,
      biomas: d.biomas,
      hospedajes_count: d.hospedajes_count,
    }));

  // Recientes: created_at < 30 días, ordenado desc.
  const ahora = Date.now();
  const treintaDiasMs = 30 * 24 * 60 * 60 * 1000;
  const recientes: DestinoMini[] = [...destinosMini]
    .filter((d) => ahora - new Date(d.created_at).getTime() < treintaDiasMs)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 6)
    .map((d) => ({
      slug: d.slug,
      nombre: d.nombre,
      region: d.region_label,
      biomas: d.biomas,
      hospedajes_count: d.hospedajes_count,
      agregadoHace: formatHaceTiempo(d.created_at),
    }));

  // Para Nearby: trending + recientes (fallback hasta que tengamos cálculo de distancia real).
  const candidatosNearby: DestinoMini[] = [
    ...trending.slice(0, 4),
    ...recientes.slice(0, 2),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container">
          <div className="flex h-16 items-center gap-4">
            <Link
              href="/"
              className="font-display text-xl tracking-tight"
              aria-label={`${siteConfig.name} — red de portales turísticos locales`}
            >
              <span className="wordmark-mis">Mis</span>{" "}
              <span className="wordmark-esc">Escapadas</span>
            </Link>
            <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
              Red de portales turísticos locales
            </span>
          </div>
        </div>
      </header>

      <main>
        <SearchHero destinos={destinosLite} />

        {regiones.length > 0 && (
          <section className="py-12 md:py-16">
            <div className="container">
              <header className="mb-8 max-w-2xl">
                <p className="eyebrow flex items-center gap-2">
                  <MapPinned className="h-4 w-4" aria-hidden />
                  Por región
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
                  Buscá por la zona del país
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Regiones curadas con su clima, su cultura y los pueblos que
                  las componen.
                </p>
              </header>
              <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {regiones.map((r) => (
                  <RegionCard
                    key={r.slug}
                    slug={r.slug}
                    nombre={r.nombre}
                    descripcion={r.descripcion}
                    biomas={r.biomas}
                    destinos_count={r.destinos_count}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {candidatosNearby.length > 0 && (
          <NearbyBlock candidatos={candidatosNearby} />
        )}

        {trending.length > 0 && (
          <section className="py-12">
            <div className="container">
              <header className="mb-6 max-w-2xl">
                <p className="eyebrow flex items-center gap-2">
                  <Flame className="h-4 w-4" aria-hidden />
                  Tendencia esta semana
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
                  Los pueblos más buscados
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Curado a partir de búsquedas + reservas recientes en toda
                  la red.
                </p>
              </header>
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
                {trending.map((d) => (
                  <DestinoMiniCard key={d.slug} destino={d} />
                ))}
              </div>
            </div>
          </section>
        )}

        {recientes.length > 0 && (
          <section className="bg-muted/40 py-12">
            <div className="container">
              <header className="mb-6 max-w-2xl">
                <p className="eyebrow flex items-center gap-2">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Recién sumados
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
                  Nuevos destinos en la red
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pueblos que se sumaron con su responsable local en las
                  últimas semanas.
                </p>
              </header>
              <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] sm:gap-5">
                {recientes.map((d) => (
                  <DestinoMiniCard key={d.slug} destino={d} />
                ))}
              </div>
            </div>
          </section>
        )}

        <BiomaStrip />

        <section className="py-16">
          <div className="container">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white md:p-14">
              <h2 className="max-w-2xl font-display text-3xl tracking-tight md:text-4xl">
                ¿Sos comerciante o referente de un destino?
              </h2>
              <p className="mt-3 max-w-xl text-sm text-slate-300 md:text-base">
                Cargá tu hospedaje, tu local o tu propuesta gastronómica.
                La red Mis Escapadas te conecta con viajeros que ya están
                mirando tu pueblo — sin OTAs en el medio.
              </p>
              <Link
                href="/registro"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-white/90"
              >
                Sumar mi propuesta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
