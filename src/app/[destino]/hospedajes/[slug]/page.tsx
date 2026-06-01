import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, ExternalLink } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { DestinoHeader } from "@/components/layout/DestinoHeader";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { AmenitiesList } from "@/features/hospedajes/components/AmenitiesList";
import { HospedajeGallery } from "@/features/hospedajes/components/HospedajeGallery";
import { WhatsAppButton } from "@/features/hospedajes/components/WhatsAppButton";
import { ValidationBadge } from "@/features/hospedajes/components/ValidationBadge";
import { ConsultaForm } from "@/features/consultas/components/ConsultaForm";
import { UnidadCard } from "@/features/unidades/components/UnidadCard";
import { listUnidadTypesPorHospedaje } from "@/features/unidades/lib/queries";
import {
  OPERATIONAL_AMENITIES,
  OPERATIONAL_AMENITY_GROUPS,
} from "@/config/amenities-operational";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getDestinoBySlug,
  getHospedajeBySlug,
} from "@/features/hospedajes/lib/queries";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import {
  buildHospedajeJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";
import { getFotoUrl } from "@/lib/storage";
import { formatDateISO } from "@/lib/date";

interface PageProps {
  params: Promise<{ destino: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
function isISO(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destino: destinoSlug, slug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) return {};
  const hospedaje = await getHospedajeBySlug(destino.id, slug);
  if (!hospedaje) return {};

  const title =
    hospedaje.meta_title ?? `${hospedaje.nombre} — ${destino.nombre}`;
  const description =
    hospedaje.meta_description ?? hospedaje.descripcion_corta;
  const principal = hospedaje.hospedaje_fotos.find((f) => f.es_principal) ?? hospedaje.hospedaje_fotos[0];
  const ogImage = principal ? getFotoUrl(principal.storage_path) : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/${destinoSlug}/hospedajes/${slug}` },
    openGraph: {
      title,
      description,
      url: `/${destinoSlug}/hospedajes/${slug}`,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function HospedajeDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { destino: destinoSlug, slug } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) notFound();
  const hospedaje = await getHospedajeBySlug(destino.id, slug);
  if (!hospedaje) notFound();

  // Contexto heredado del buscador principal (vía URL): prellena la consulta y
  // viaja a las unidades, para no recargar fechas/pax al consultar.
  const sp = await searchParams;
  const ctxCheckIn = isISO(pickStr(sp.check_in)) ? pickStr(sp.check_in) : undefined;
  const ctxCheckOut = isISO(pickStr(sp.check_out)) ? pickStr(sp.check_out) : undefined;
  const ctxAdultos = Number(pickStr(sp.adultos));
  const ctxNinos = Number(pickStr(sp.ninos));
  const ctxBebes = Number(pickStr(sp.bebes));
  const huespedes =
    Number.isFinite(ctxAdultos) && ctxAdultos > 0
      ? ctxAdultos + (Number.isFinite(ctxNinos) ? ctxNinos : 0)
      : undefined;
  const unidadQuery = ctxCheckIn
    ? new URLSearchParams({
        check_in: ctxCheckIn,
        ...(ctxCheckOut ? { check_out: ctxCheckOut } : {}),
        adultos: String(Number.isFinite(ctxAdultos) && ctxAdultos > 0 ? ctxAdultos : 2),
        ninos: String(Number.isFinite(ctxNinos) ? ctxNinos : 0),
        bebes: String(Number.isFinite(ctxBebes) ? ctxBebes : 0),
      }).toString()
    : "";

  // Mensaje prefill de WhatsApp: si venimos del buscador con fechas, las
  // incluimos para que el responsable reciba el contexto sin pedirlo de nuevo.
  const waMensaje = ctxCheckIn
    ? `Hola, vi ${hospedaje.nombre} en Mis Escapadas y quería consultar disponibilidad para el ${formatDateISO(ctxCheckIn)}` +
      (ctxCheckOut ? ` al ${formatDateISO(ctxCheckOut)}` : "") +
      (huespedes ? ` para ${huespedes} ${huespedes === 1 ? "persona" : "personas"}` : "") +
      "."
    : undefined;

  const url = `${siteConfig.url}/${destinoSlug}/hospedajes/${slug}`;

  const tipos = await listUnidadTypesPorHospedaje(hospedaje.id);
  const tiposPublicables = tipos.filter(
    (t) => t.activo && t.unidades.some((u) => u.activa)
  );

  const operationalAmenities = (hospedaje.amenities_operational ?? []).filter(
    (k) => k in OPERATIONAL_AMENITIES
  );

  return (
    <>
      <JsonLd
        data={buildHospedajeJsonLd(
          {
            ...hospedaje,
            descripcion_larga: hospedaje.descripcion_larga,
            destino: {
              nombre: destino.nombre,
              region: destino.region,
              provincia: destino.provincia,
              pais: destino.pais,
            },
            fotos: hospedaje.hospedaje_fotos,
          },
          url
        )}
      />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${destinoSlug}` },
          { name: "Hospedajes", url: `/${destinoSlug}/hospedajes` },
          { name: hospedaje.nombre, url: `/${destinoSlug}/hospedajes/${slug}` },
        ])}
      />

      <DestinoHeader destinoSlug={destinoSlug} destinoNombre={destino.nombre} />

      <main>
        <Container size="xl" as="article">
          {/* Breadcrumb + header */}
          <div className="py-6">
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <Link href={`/${destinoSlug}`} className="hover:text-foreground">
                    {destino.nombre}
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/${destinoSlug}/hospedajes`}
                    className="hover:text-foreground"
                  >
                    Hospedajes
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-foreground" aria-current="page">
                  {hospedaje.nombre}
                </li>
              </ol>
            </nav>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {TIPO_HOSPEDAJE_LABEL[hospedaje.tipo]}
                  </Badge>
                  <ValidationBadge size="md" />
                  {hospedaje.destacado && (
                    <Badge variant="featured">Destacado</Badge>
                  )}
                </div>
                <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">
                  {hospedaje.nombre}
                </h1>
                <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {hospedaje.direccion}
                </p>
              </div>
            </div>
          </div>

          {/* Galería */}
          <HospedajeGallery
            fotos={hospedaje.hospedaje_fotos}
            entityName={hospedaje.nombre}
          />

          {/* Contenido + sidebar */}
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-10">
              {hospedaje.descripcion_larga && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Acerca del hospedaje
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-foreground">
                    {hospedaje.descripcion_larga}
                  </p>
                </section>
              )}

              <section>
                <h2 className="font-display text-2xl tracking-tight">
                  Servicios del complejo
                </h2>
                <AmenitiesList
                  amenities={hospedaje.amenities}
                  variant="grid"
                  className="mt-6"
                />
              </section>

              {operationalAmenities.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Cómo opera el hospedaje
                  </h2>
                  <div className="mt-6 space-y-4">
                    {OPERATIONAL_AMENITY_GROUPS.map((group) => {
                      const items = operationalAmenities
                        .map((k) => OPERATIONAL_AMENITIES[k as keyof typeof OPERATIONAL_AMENITIES])
                        .filter((a) => a && a.group === group.key);
                      if (items.length === 0) return null;
                      return (
                        <div key={group.key}>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {group.label}
                          </p>
                          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {items.map((a) => {
                              const Icon = a.icon;
                              return (
                                <li
                                  key={a.key}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <Icon
                                    className="h-4 w-4 text-primary"
                                    aria-hidden
                                  />
                                  <span>{a.label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {tiposPublicables.length > 0 && (
                <section id="unidades">
                  <h2 className="font-display text-2xl tracking-tight">
                    Unidades
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tiposPublicables.length === 1
                      ? "Tipo de unidad disponible. El calendario muestra los próximos días con disponibilidad."
                      : `${tiposPublicables.length} tipos de unidad. Cada uno con su capacidad, amenities y disponibilidad.`}
                  </p>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {tiposPublicables.map((tipo) => (
                      <UnidadCard
                        key={tipo.id}
                        tipo={tipo}
                        destinoSlug={destinoSlug}
                        hospedajeSlug={slug}
                        query={unidadQuery}
                      />
                    ))}
                  </div>
                </section>
              )}

              {hospedaje.google_maps_url && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Ubicación
                  </h2>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {hospedaje.direccion}
                  </p>
                  <a
                    href={hospedaje.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Ver en Google Maps
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </section>
              )}

              <section id="consultar">
                <h2 className="font-display text-2xl tracking-tight">
                  Consultar disponibilidad
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mandale tu consulta al responsable. Te contesta directo, sin
                  intermediarios.
                </p>
                <div className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
                  <ConsultaForm
                    hospedajeId={hospedaje.id}
                    hospedajeNombre={hospedaje.nombre}
                    capacidadMax={hospedaje.capacidad_max ?? null}
                    initialCheckIn={ctxCheckIn}
                    initialCheckOut={ctxCheckOut}
                    initialAdultos={
                      Number.isFinite(ctxAdultos) && ctxAdultos > 0
                        ? ctxAdultos
                        : undefined
                    }
                    initialNinos={
                      Number.isFinite(ctxNinos) && ctxNinos > 0
                        ? ctxNinos
                        : undefined
                    }
                    initialBebes={
                      Number.isFinite(ctxBebes) && ctxBebes > 0
                        ? ctxBebes
                        : undefined
                    }
                  />
                </div>
              </section>
            </div>

            {/* Sidebar sticky con WhatsApp */}
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  Contacto directo con el responsable
                </p>
                <p className="mt-1 font-medium">
                  {hospedaje.responsable_nombre}
                </p>

                <WhatsAppButton
                  whatsapp={hospedaje.whatsapp}
                  hospedajeNombre={hospedaje.nombre}
                  mensaje={waMensaje}
                  size="lg"
                  fullWidth
                  className="mt-5"
                />

                <p className="mt-3 text-xs text-muted-foreground">
                  Sin intermediarios, sin comisiones. La consulta va directo al
                  alojamiento.
                </p>

                {hospedaje.instagram && (
                  <p className="mt-4 text-sm">
                    <span className="text-muted-foreground">Instagram: </span>
                    <a
                      href={`https://instagram.com/${hospedaje.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      @{hospedaje.instagram}
                    </a>
                  </p>
                )}
                {hospedaje.website && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Web: </span>
                    <a
                      href={hospedaje.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Sitio oficial
                    </a>
                  </p>
                )}
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
