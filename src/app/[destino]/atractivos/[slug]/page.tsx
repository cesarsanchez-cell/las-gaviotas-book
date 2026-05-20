import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, ExternalLink, Globe, Instagram, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { HospedajeGallery } from "@/features/hospedajes/components/HospedajeGallery";
import { buttonVariants } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDestinoBySlug } from "@/features/hospedajes/lib/queries";
import { getLugarBySlug } from "@/features/lugares/lib/queries";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import {
  buildLugarJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";
import { getFotoUrl } from "@/lib/storage";

interface PageProps {
  params: Promise<{ destino: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { destino: destinoSlug, slug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) return {};
  const lugar = await getLugarBySlug(destino.id, slug);
  if (!lugar || lugar.tipo !== "atractivo") return {};

  const title = lugar.meta_title ?? `${lugar.nombre} — ${destino.nombre}`;
  const description = lugar.meta_description ?? lugar.descripcion_corta;
  const principal =
    lugar.lugar_fotos.find((f) => f.es_principal) ?? lugar.lugar_fotos[0];
  const ogImage = principal ? getFotoUrl(principal.storage_path) : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/${destinoSlug}/atractivos/${slug}` },
    openGraph: {
      title,
      description,
      url: `/${destinoSlug}/atractivos/${slug}`,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function AtractivoDetailPage({ params }: PageProps) {
  const { destino: destinoSlug, slug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) notFound();
  const lugar = await getLugarBySlug(destino.id, slug);
  if (!lugar || lugar.tipo !== "atractivo") notFound();

  const url = `${siteConfig.url}/${destinoSlug}/atractivos/${slug}`;
  const categoriaLabel = getCategoriaLabel("atractivo", lugar.categoria);

  return (
    <>
      <JsonLd
        data={buildLugarJsonLd(
          {
            tipo: "atractivo",
            categoria: lugar.categoria,
            nombre: lugar.nombre,
            descripcion_corta: lugar.descripcion_corta,
            descripcion_larga: lugar.descripcion_larga,
            direccion: lugar.direccion,
            lat: lugar.lat,
            lng: lugar.lng,
            website: lugar.website,
            destino: {
              nombre: destino.nombre,
              region: destino.region,
              provincia: destino.provincia,
              pais: destino.pais,
            },
            fotos: lugar.lugar_fotos,
          },
          url
        )}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${destinoSlug}` },
          { name: "Atractivos", url: `/${destinoSlug}/atractivos` },
          { name: lugar.nombre, url: `/${destinoSlug}/atractivos/${slug}` },
        ])}
      />

      <Header destinoSlug={destinoSlug} destinoNombre={destino.nombre} />

      <main>
        <Container size="xl" as="article">
          <div className="py-6">
            <nav
              aria-label="Breadcrumb"
              className="mb-4 text-sm text-muted-foreground"
            >
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link
                    href={`/${destinoSlug}`}
                    className="hover:text-foreground"
                  >
                    {destino.nombre}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/${destinoSlug}/atractivos`}
                    className="hover:text-foreground"
                  >
                    Atractivos
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-foreground" aria-current="page">
                  {lugar.nombre}
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              {categoriaLabel && (
                <Badge variant="secondary">{categoriaLabel}</Badge>
              )}
              {lugar.imperdible && (
                <Badge
                  variant="featured"
                  className="inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Imperdible
                </Badge>
              )}
              {lugar.destacado && !lugar.imperdible && (
                <Badge variant="featured">Destacado</Badge>
              )}
            </div>
            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">
              {lugar.nombre}
            </h1>
            {lugar.direccion && (
              <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden />
                {lugar.direccion}
              </p>
            )}
          </div>

          {lugar.lugar_fotos.length > 0 && (
            <HospedajeGallery
              fotos={lugar.lugar_fotos}
              entityName={lugar.nombre}
            />
          )}

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-10">
              {lugar.descripcion_larga && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Acerca del lugar
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-foreground">
                    {lugar.descripcion_larga}
                  </p>
                </section>
              )}

              {(lugar.google_maps_url || lugar.direccion) && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Cómo llegar
                  </h2>
                  {lugar.direccion && (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {lugar.direccion}
                    </p>
                  )}
                  {lugar.google_maps_url && (
                    <a
                      href={lugar.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Ver en Google Maps
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Atractivo de {destino.nombre}
                </p>
                <p className="mt-1 font-medium">{lugar.nombre}</p>

                {lugar.google_maps_url && (
                  <a
                    href={lugar.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${buttonVariants({ size: "lg" })} mt-5 w-full`}
                  >
                    <MapPin className="h-4 w-4" />
                    Cómo llegar
                  </a>
                )}

                {lugar.website && (
                  <p className="mt-4 flex items-center gap-2 text-sm">
                    <Globe
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                    <a
                      href={lugar.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Más información
                    </a>
                  </p>
                )}

                {lugar.instagram && (
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <Instagram
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                    <a
                      href={`https://instagram.com/${lugar.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      @{lugar.instagram}
                    </a>
                  </p>
                )}

                <Link
                  href={`/${destinoSlug}/atractivos`}
                  className="mt-5 inline-block text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Ver todos los atractivos
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
