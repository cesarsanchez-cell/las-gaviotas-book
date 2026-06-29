import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { HubV2 } from "@/features/home/components/HubV2";
import {
  buildHeroSlides,
  buildAtraccionHeroSlides,
} from "@/features/home/lib/hero-slides";
import { getHeaderSession } from "@/features/home/lib/header-session";
import {
  listVerticalItemsRed,
  listAtraccionesHero,
  type VerticalItem,
  type VerticalKey,
  type DestinoPublicadoLite,
} from "@/features/home/lib/queries";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDestinoBySlug } from "@/features/hospedajes/lib/queries";
import { listPromosByDestino } from "@/features/promos/lib/queries";
import { listCombosByDestino } from "@/features/combos/lib/queries";
import { listRubros, listDatosUtilesByDestino } from "@/features/datos-utiles/lib/queries";
import { buildDestinoJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ destino: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) return {};

  const title = `Mis Escapadas a ${destino.nombre}`;
  const description =
    destino.descripcion_corta ??
    `Hospedajes, gastronomía y atractivos verificados por la comunidad de ${destino.nombre}.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title,
      description,
      url: `/${slug}`,
      type: "website",
    },
  };
}

export default async function DestinoPage({ params }: PageProps) {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) notFound();

  const session = await getHeaderSession();

  // Hub scopeado al destino: mismas verticales/promos/combos que la home, pero
  // acotadas a este destino.
  const [hospedajes, gastronomia, atractivos, promos, combos, atracciones, rubros, datosUtiles] =
    await Promise.all([
      listVerticalItemsRed("hospedajes", slug),
      listVerticalItemsRed("gastronomia", slug),
      listVerticalItemsRed("atractivos", slug),
      listPromosByDestino(destino.id),
      listCombosByDestino(destino.id),
      listAtraccionesHero(destino.id),
      listRubros(),
      listDatosUtilesByDestino(destino.id),
    ]);

  const verticalData: Record<VerticalKey, VerticalItem[]> = {
    hospedajes,
    gastronomia,
    atractivos,
  };

  const heroSlides = buildHeroSlides(verticalData);
  const atraccionSlides = buildAtraccionHeroSlides(atracciones);

  // Lite mínimo para el hub (en modo scopeado no se usan biomas/geo/conteo).
  const destinoLite: DestinoPublicadoLite = {
    slug: destino.slug,
    nombre: destino.nombre,
    region_label: destino.region ?? destino.provincia,
    region_slug: null,
    ciudad_label: null,
    pais: destino.pais,
    biomas: [],
    lat: destino.lat,
    lng: destino.lng,
    hospedajes_count: hospedajes.length,
  };

  const url = `${siteConfig.url}/${slug}`;
  const heroEyebrow =
    [destino.region ?? destino.provincia, destino.pais]
      .filter(Boolean)
      .join(" · ") || null;

  return (
    <>
      <JsonLd data={buildDestinoJsonLd(destino, url)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${slug}` },
        ])}
      />

      <HubV2
        verticalData={verticalData}
        destinos={[destinoLite]}
        regiones={[]}
        promos={promos}
        combos={combos}
        session={session}
        heroSlides={heroSlides}
        atraccionSlides={atraccionSlides}
        heroEyebrow={heroEyebrow}
        heroTitle={destino.nombre}
        heroSubtitle={destino.descripcion_corta}
        scopedDestino={{ slug: destino.slug, nombre: destino.nombre }}
        rubros={rubros}
        datosUtiles={datosUtiles}
      />
      <Footer />
    </>
  );
}
