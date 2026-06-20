import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Sparkles, BedDouble } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildZonaJsonLd } from "@/lib/seo/jsonld";
import {
  getZonaPublicaBySlug,
  listAtraccionesDeZona,
  listDestinosDeZona,
} from "@/features/zonas/lib/queries";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const zona = await getZonaPublicaBySlug(slug);
  if (!zona) return { title: "Zona no encontrada" };
  return {
    title: `${zona.nombre} — Mis Escapadas`,
    description:
      zona.descripcion ??
      `Atracciones y destinos de ${zona.nombre}, en la red Mis Escapadas.`,
    alternates: { canonical: `/zona/${slug}` },
    openGraph: {
      title: `${zona.nombre} — Mis Escapadas`,
      description: zona.descripcion ?? undefined,
      url: `/zona/${slug}`,
      type: "website",
      ...(zona.fotoUrl ? { images: [{ url: zona.fotoUrl }] } : {}),
    },
  };
}

export default async function ZonaPage({ params }: PageProps) {
  const { slug } = await params;
  const zona = await getZonaPublicaBySlug(slug);
  if (!zona) notFound();

  const [atracciones, destinos] = await Promise.all([
    listAtraccionesDeZona(zona.id),
    listDestinosDeZona(zona.id),
  ]);

  // Una zona sin atracciones publicadas no tiene página pública (su razón de ser
  // pública son las atracciones curadas).
  if (atracciones.length === 0) notFound();

  const url = `${siteConfig.url}/zona/${slug}`;

  return (
    <>
      <JsonLd data={buildZonaJsonLd(zona, atracciones, url)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: zona.nombre, url: `/zona/${slug}` },
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
              · {zona.nombre}
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero de la zona: foto si hay; si no, fondo sólido de marca. */}
        <section className="relative overflow-hidden bg-primary text-white">
          {zona.fotoUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zona.fotoUrl}
                alt={`Paisaje de ${zona.nombre}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
            </>
          )}
          <div className="relative container py-14 md:py-20">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-white/80 transition hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Mis Escapadas
            </Link>
            <p className="mt-4 text-xs font-medium uppercase tracking-widest text-white/80">
              Zona
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl tracking-tight md:text-6xl">
              {zona.nombre}
            </h1>
            {zona.descripcion && (
              <p className="mt-4 max-w-2xl text-base text-white/90 md:text-lg">
                {zona.descripcion}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" aria-hidden />
                {atracciones.length} atracci
                {atracciones.length === 1 ? "ón" : "ones"}
              </span>
              {destinos.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {destinos.length} destino{destinos.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Atracciones de la zona */}
        <section className="py-12">
          <div className="container">
            <header className="mb-6 max-w-2xl">
              <p className="eyebrow">Imperdibles de la zona</p>
              <h2 className="mt-2 font-display text-3xl tracking-tight text-foreground md:text-4xl">
                Qué no te podés perder
              </h2>
            </header>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {atracciones.map((a) => {
                const body = (
                  <>
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      {a.fotoUrl ? (
                        <Image
                          src={a.fotoUrl}
                          alt={a.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Sparkles className="h-8 w-8" aria-hidden />
                        </div>
                      )}
                      {a.categoria && (
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {a.categoria}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display text-xl tracking-tight text-foreground">
                        {a.nombre}
                      </h3>
                      {a.ubicacionTexto && (
                        <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {a.ubicacionTexto}
                        </p>
                      )}
                      {a.descripcion && (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {a.descripcion}
                        </p>
                      )}
                    </div>
                  </>
                );
                const cls =
                  "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md";
                return a.anclaSlug ? (
                  <Link key={a.slug} href={`/${a.anclaSlug}`} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <article key={a.slug} className={cls}>
                    {body}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Destinos de la zona */}
        {destinos.length > 0 && (
          <section className="border-t border-border py-12">
            <div className="container">
              <header className="mb-6 max-w-2xl">
                <p className="eyebrow">Dónde quedarte</p>
                <h2 className="mt-2 font-display text-2xl tracking-tight text-foreground md:text-3xl">
                  Los destinos de {zona.nombre}
                </h2>
              </header>
              <div className="flex flex-wrap gap-3">
                {destinos.map((d) => (
                  <Link
                    key={d.slug}
                    href={`/${d.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                  >
                    {d.nombre}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <BedDouble className="h-3.5 w-3.5" aria-hidden />
                      {d.hospedajesCount}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
