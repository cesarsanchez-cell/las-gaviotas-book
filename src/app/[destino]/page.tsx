import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Utensils,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/button";
import { HospedajeCard } from "@/features/hospedajes/components/HospedajeCard";
import { LugarCard } from "@/features/lugares/components/LugarCard";
import {
  HeroCarousel,
  type HeroSlide,
} from "@/features/destinos/components/HeroCarousel";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getDestinoBySlug,
  getDestacadosByDestino,
  listHospedajesByDestino,
  type HospedajeCard as HospedajeCardData,
} from "@/features/hospedajes/lib/queries";
import {
  listImperdiblesByDestino,
  listLugaresByDestino,
  type LugarCard as LugarCardData,
} from "@/features/lugares/lib/queries";
import { listPromosByDestino } from "@/features/promos/lib/queries";
import { DestinoPromos } from "@/features/promos/components/DestinoPromos";
import { listCombosByDestino } from "@/features/combos/lib/queries";
import { CombosSection } from "@/features/combos/components/CombosSection";
import { buildDestinoJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";
import { getFotoUrl } from "@/lib/storage";

interface PageProps {
  params: Promise<{ destino: string }>;
}

const HOSP_TIPO_LABEL: Record<string, string> = {
  hotel: "Hotel",
  apart: "Apart",
  cabana: "Cabaña",
  hosteria: "Hostería",
  camping: "Camping",
  casa: "Casa",
  departamento: "Departamento",
};

function fotoOrPlaceholder(path?: string): string {
  return path ? getFotoUrl(path) : getFotoUrl("placeholders/cabana-1.jpg");
}

/**
 * Arma hasta 5 slides para el HeroCarousel mezclando imperdibles, hospedajes
 * destacados y gastronómicos; completa con lo que haya. Dedupea por tipo+slug.
 */
function buildHeroSlides(
  destinoSlug: string,
  imperdibles: LugarCardData[],
  destacados: HospedajeCardData[],
  lugares: LugarCardData[]
): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const seen = new Set<string>();

  const pushLugar = (l: LugarCardData) => {
    const type = l.tipo === "gastronomico" ? "gastronomia" : "atractivo";
    const key = `${type}:${l.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    slides.push({
      type,
      slug: l.slug,
      nombre: l.nombre,
      categoria: getCategoriaLabel(l.tipo, l.categoria) ?? "",
      descripcion: l.descripcion_corta,
      photoUrl: fotoOrPlaceholder(l.foto_principal_path),
      href: `/${destinoSlug}/${type === "gastronomia" ? "gastronomia" : "atractivos"}/${l.slug}`,
    });
  };

  const pushHospedaje = (h: HospedajeCardData) => {
    const key = `hospedaje:${h.slug}`;
    if (seen.has(key)) return;
    seen.add(key);
    slides.push({
      type: "hospedaje",
      slug: h.slug,
      nombre: h.nombre,
      categoria: HOSP_TIPO_LABEL[h.tipo] ?? "Hospedaje",
      descripcion: h.descripcion_corta,
      photoUrl: fotoOrPlaceholder(h.foto_principal_path),
      href: `/${destinoSlug}/hospedajes/${h.slug}`,
    });
  };

  imperdibles.slice(0, 2).forEach(pushLugar);
  destacados.slice(0, 2).forEach(pushHospedaje);
  lugares.filter((l) => l.tipo === "gastronomico").slice(0, 2).forEach(pushLugar);
  for (const l of lugares) {
    if (slides.length >= 5) break;
    pushLugar(l);
  }
  return slides.slice(0, 5);
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

  const [imperdibles, destacados, hospedajesTodos, lugaresTodos, promos, combos] =
    await Promise.all([
      listImperdiblesByDestino(destino.id, 6),
      getDestacadosByDestino(destino.id, 3),
      listHospedajesByDestino(destino.id, undefined, 6),
      listLugaresByDestino(destino.id, undefined, 6),
      listPromosByDestino(destino.id),
      listCombosByDestino(destino.id),
    ]);

  const heroSlides = buildHeroSlides(
    slug,
    imperdibles,
    destacados,
    lugaresTodos
  );

  const url = `${siteConfig.url}/${slug}`;

  return (
    <>
      <JsonLd data={buildDestinoJsonLd(destino, url)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${slug}` },
        ])}
      />

      <Header destinoSlug={slug} destinoNombre={destino.nombre} />

      <main>
        {/* Hero emocional: carrusel de imperdibles/hospedajes/gastro. Si el
            destino aún no tiene contenido, hero mínimo con el título. */}
        {heroSlides.length > 0 ? (
          <HeroCarousel
            nombre={destino.nombre}
            region={destino.region ?? destino.provincia}
            pais={destino.pais}
            descripcionCorta={destino.descripcion_corta}
            slides={heroSlides}
            searchHref={`/${slug}/hospedajes`}
          />
        ) : (
          <section className="bg-slate-950 text-white">
            <Container size="lg">
              <div className="py-20 md:py-28">
                <p className="text-sm font-medium uppercase tracking-widest text-amber-300">
                  {[destino.region ?? destino.provincia, destino.pais]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <h1 className="mt-4 font-display text-5xl tracking-tight drop-shadow-lg md:text-7xl">
                  {destino.nombre}
                </h1>
                {destino.descripcion_corta && (
                  <p className="mt-6 max-w-2xl text-lg text-white/90 md:text-xl">
                    {destino.descripcion_corta}
                  </p>
                )}
              </div>
            </Container>
          </section>
        )}

        {/* Promos del destino — banda con toggle de vertical (solo si hay) */}
        <DestinoPromos promos={promos} destinoNombre={destino.nombre} />

        {/* Escapadas armadas (combos) — solo si hay combos publicados */}
        <CombosSection combos={combos} destinoNombre={destino.nombre} />

        {/* Imperdibles — solo si hay */}
        {imperdibles.length > 0 && (
          <section className="bg-slate-950 py-16 text-white md:py-24">
            <Container size="xl">
              <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-amber-300">
                    <Sparkles className="h-4 w-4" aria-hidden />
                    Imperdibles
                  </p>
                  <h2 className="mt-2 font-display text-3xl md:text-4xl tracking-tight">
                    Lo que no te podés perder en {destino.nombre}
                  </h2>
                  <p className="mt-2 max-w-xl text-white/70">
                    Selección curada por la comunidad local. Lugares que la
                    gente vuelve a recomendar año tras año.
                  </p>
                </div>
              </header>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {imperdibles.map((l, i) => (
                  <LugarCard
                    key={l.id}
                    destinoSlug={slug}
                    lugar={l}
                    priority={i === 0}
                  />
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* Hospedajes destacados */}
        {destacados.length > 0 && (
          <Section spacing="lg">
            <Container size="xl">
              <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-primary">
                    <Building2 className="h-4 w-4" aria-hidden />
                    Hospedajes
                  </p>
                  <h2 className="mt-2 font-display text-3xl md:text-4xl tracking-tight">
                    Destacados de {destino.nombre}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Selección curada de la comunidad.
                  </p>
                </div>
                <Link
                  href={`/${slug}/hospedajes`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todos los hospedajes →
                </Link>
              </header>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destacados.map((h, i) => (
                  <HospedajeCard
                    key={h.id}
                    destinoSlug={slug}
                    hospedaje={h}
                    priority={i === 0}
                  />
                ))}
              </div>
            </Container>
          </Section>
        )}

        {/* Gastronomía + Atractivos preview */}
        {lugaresTodos.length > 0 && (
          <Section spacing="lg" tone="muted">
            <Container size="xl">
              <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-primary">
                    <Utensils className="h-4 w-4" aria-hidden />
                    Para hacer y comer
                  </p>
                  <h2 className="mt-2 font-display text-3xl md:text-4xl tracking-tight">
                    Vida local en {destino.nombre}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Bares, restaurantes y los lugares que la comunidad
                    recomienda.
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <Link
                    href={`/${slug}/gastronomia`}
                    className="font-medium text-primary hover:underline"
                  >
                    Gastronomía →
                  </Link>
                  <Link
                    href={`/${slug}/atractivos`}
                    className="font-medium text-primary hover:underline"
                  >
                    Atractivos →
                  </Link>
                </div>
              </header>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lugaresTodos.map((l) => (
                  <LugarCard key={l.id} destinoSlug={slug} lugar={l} />
                ))}
              </div>
            </Container>
          </Section>
        )}

        {/* Bloque "explorá" final */}
        {hospedajesTodos.length === 0 &&
          lugaresTodos.length === 0 &&
          imperdibles.length === 0 && (
            <Section spacing="lg">
              <Container size="lg">
                <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                  <p className="font-display text-2xl tracking-tight">
                    Todavía estamos cargando contenido de {destino.nombre}.
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Volvé pronto — pronto vas a encontrar acá lo mejor del
                    destino.
                  </p>
                </div>
              </Container>
            </Section>
          )}

        {hospedajesTodos.length > 0 && (
          <Section spacing="md">
            <Container size="lg">
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white md:p-12">
                <h2 className="font-display text-2xl md:text-3xl tracking-tight">
                  ¿Buscás dónde quedarte?
                </h2>
                <p className="mt-2 max-w-xl text-white/80">
                  Hospedajes verificados con contacto directo al responsable.
                  Sin intermediarios, sin comisiones.
                </p>
                <Link
                  href={`/${slug}/hospedajes`}
                  className={`${buttonVariants({ size: "lg" })} mt-6`}
                >
                  Explorar hospedajes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Container>
          </Section>
        )}
      </main>

      <Footer />
    </>
  );
}
