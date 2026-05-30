import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, BedDouble } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import {
  getRegionBySlug,
  listDestinosDeRegion,
} from "@/features/regiones/lib/queries";
import {
  BiomaIcon,
  biomaColor,
  biomaLabel,
} from "@/features/home/components/BiomaIcon";
import { DestinoCard } from "@/features/home/components/DestinoCard";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) return { title: "Región no encontrada" };
  return {
    title: `${region.nombre} — Mis Escapadas`,
    description:
      region.descripcion ??
      `Destinos turísticos en ${region.nombre}, parte de la red Mis Escapadas.`,
    alternates: { canonical: `/regiones/${slug}` },
    openGraph: {
      title: `${region.nombre} — Mis Escapadas`,
      description: region.descripcion ?? undefined,
      url: `/regiones/${slug}`,
      type: "website",
    },
  };
}

export default async function RegionPage({ params }: PageProps) {
  const { slug } = await params;
  const region = await getRegionBySlug(slug);
  // Región inexistente o despublicada no tiene página pública.
  if (!region || !region.activo) notFound();

  const destinos = await listDestinosDeRegion(region.id);

  // Regla de publicación: región visible ⇔ ≥1 destino publicado.
  if (destinos.length === 0) notFound();
  // Con un solo destino, la región no aporta una capa intermedia: vamos directo.
  if (destinos.length === 1) redirect(`/${destinos[0].slug}`);

  const primary = region.biomas[0] ?? "playa";
  const secondary = region.biomas[1] ?? primary;
  const totalHospedajes = destinos.reduce(
    (sum, d) => sum + d.hospedajes_count,
    0
  );

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: region.nombre, url: `/regiones/${slug}` },
        ])}
      />
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
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
            <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">
              · {region.nombre}
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero pintado con gradient de los biomas dominantes */}
        <section
          className="relative overflow-hidden text-white"
          style={{
            background: `linear-gradient(135deg, ${biomaColor(primary)} 0%, ${biomaColor(secondary)} 100%)`,
          }}
        >
          <div className="container py-14 md:py-20">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-white/80 transition hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Mis Escapadas
            </Link>
            <p className="mt-4 text-xs font-medium uppercase tracking-widest text-white/80">
              Región
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl tracking-tight md:text-6xl">
              {region.nombre}
            </h1>
            {region.descripcion && (
              <p className="mt-4 max-w-2xl text-base text-white/90 md:text-lg">
                {region.descripcion}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {region.biomas.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  <BiomaIcon bioma={b} size={12} />
                  {biomaLabel(b)}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden />
                {destinos.length} destinos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" aria-hidden />
                {totalHospedajes} hospedaje{totalHospedajes === 1 ? "" : "s"}{" "}
                verificado{totalHospedajes === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </section>

        {/* Listado de destinos (siempre 2+: con 1 redirige, con 0 es notFound) */}
        <section className="py-12">
          <div className="container">
            <header className="mb-6 max-w-2xl">
              <p className="eyebrow">Destinos de la región</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
                Elegí dónde escaparte en {region.nombre}
              </h2>
            </header>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {destinos.map((d) => (
                <DestinoCard
                  key={d.id}
                  slug={d.slug}
                  nombre={d.nombre}
                  region={d.region}
                  pais={d.pais}
                  descripcion_corta={d.descripcion_corta}
                  biomas={d.biomas}
                  hospedajes_count={d.hospedajes_count}
                  foto_path={d.foto_path}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
