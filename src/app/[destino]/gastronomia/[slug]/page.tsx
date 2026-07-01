import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  MapPin,
  ExternalLink,
  Instagram,
  Globe,
  Phone,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { DestinoHeader } from "@/components/layout/DestinoHeader";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { HospedajeGallery } from "@/features/hospedajes/components/HospedajeGallery";
import { WhatsAppButton } from "@/features/hospedajes/components/WhatsAppButton";
import { HorariosList } from "@/features/lugares/components/HorariosList";
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { destino: destinoSlug, slug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) return {};
  const lugar = await getLugarBySlug(destino.id, slug);
  if (!lugar || lugar.tipo !== "gastronomico") return {};

  const title =
    lugar.meta_title ?? `${lugar.nombre} — ${destino.nombre}`;
  const description = lugar.meta_description ?? lugar.descripcion_corta;
  const principal =
    lugar.lugar_fotos.find((f) => f.es_principal) ?? lugar.lugar_fotos[0];
  const ogImage = principal ? getFotoUrl(principal.storage_path) : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/${destinoSlug}/gastronomia/${slug}` },
    openGraph: {
      title,
      description,
      url: `/${destinoSlug}/gastronomia/${slug}`,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function GastronomicoDetailPage({ params, searchParams }: PageProps) {
  const { destino: destinoSlug, slug } = await params;
  const sp = await searchParams;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) notFound();
  const lugar = await getLugarBySlug(destino.id, slug);
  if (!lugar || lugar.tipo !== "gastronomico") notFound();

  const url = `${siteConfig.url}/${destinoSlug}/gastronomia/${slug}`;
  const categoriaLabel = getCategoriaLabel("gastronomico", lugar.categoria);

  return (
    <>
      <JsonLd
        data={buildLugarJsonLd(
          {
            tipo: "gastronomico",
            categoria: lugar.categoria,
            nombre: lugar.nombre,
            descripcion_corta: lugar.descripcion_corta,
            descripcion_larga: lugar.descripcion_larga,
            direccion: lugar.direccion,
            lat: lugar.lat,
            lng: lugar.lng,
            whatsapp: lugar.whatsapp,
            telefono: lugar.telefono,
            email: lugar.email,
            website: lugar.website,
            horarios: lugar.horarios,
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
          { name: "Gastronomía", url: `/${destinoSlug}/gastronomia` },
          {
            name: lugar.nombre,
            url: `/${destinoSlug}/gastronomia/${slug}`,
          },
        ])}
      />

      <DestinoHeader
        destinoSlug={destinoSlug}
        destinoNombre={destino.nombre}
        destinoId={destino.id}
        searchParams={sp}
      />

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
                    href={`/${destinoSlug}/gastronomia`}
                    className="hover:text-foreground"
                  >
                    Gastronomía
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
                <Badge variant="featured" className="inline-flex items-center gap-1">
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

              {lugar.horarios && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Horarios
                  </h2>
                  <div className="mt-4">
                    <HorariosList horarios={lugar.horarios} />
                  </div>
                </section>
              )}

              {(lugar.google_maps_url || lugar.direccion) && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Ubicación
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
                  Consultá directo al local
                </p>
                <p className="mt-1 font-medium">{lugar.nombre}</p>

                {lugar.whatsapp && (
                  <WhatsAppButton
                    whatsapp={lugar.whatsapp}
                    hospedajeNombre={lugar.nombre}
                    size="lg"
                    fullWidth
                    label="Escribir por WhatsApp"
                    className="mt-5"
                  />
                )}

                {lugar.telefono && (
                  <p className="mt-4 flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <a
                      href={`tel:${lugar.telefono}`}
                      className="font-medium hover:underline"
                    >
                      {lugar.telefono}
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

                {lugar.website && (
                  <p className="mt-2 flex items-center gap-2 text-sm">
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
                      Sitio oficial
                    </a>
                  </p>
                )}

                <p className="mt-5 text-xs text-muted-foreground">
                  Sin intermediarios. Tu consulta llega directo al local.
                </p>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
