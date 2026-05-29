import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Utensils,
  Camera,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/button";
import { HospedajeCard } from "@/features/hospedajes/components/HospedajeCard";
import { LugarCard } from "@/features/lugares/components/LugarCard";
import { BuscadorBar } from "@/features/busqueda/components/BuscadorBar";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getDestinoBySlug,
  getDestacadosByDestino,
  listHospedajesByDestino,
} from "@/features/hospedajes/lib/queries";
import {
  listImperdiblesByDestino,
  listLugaresByDestino,
} from "@/features/lugares/lib/queries";
import { listPromosByDestino } from "@/features/promos/lib/queries";
import { DestinoPromos } from "@/features/promos/components/DestinoPromos";
import { buildDestinoJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";
import { getFotoUrl } from "@/lib/storage";

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

  const [imperdibles, destacados, hospedajesTodos, lugaresTodos, promos] =
    await Promise.all([
      listImperdiblesByDestino(destino.id, 6),
      getDestacadosByDestino(destino.id, 3),
      listHospedajesByDestino(destino.id, undefined, 6),
      listLugaresByDestino(destino.id, undefined, 6),
      listPromosByDestino(destino.id),
    ]);

  const heroFoto = imperdibles[0]?.foto_principal_path;
  const heroUrl = heroFoto
    ? getFotoUrl(heroFoto)
    : getFotoUrl("placeholders/cabana-1.jpg");

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
        {/* Hero dark-theme con foto de fondo */}
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 -z-10">
            <Image
              src={heroUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Gradient lateral: oscuro a la izquierda (donde está el texto)
                y transparente a la derecha (para que se vea la foto). */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-slate-950/10" />
            {/* Sutil vignette inferior para legibilidad del buscador. */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/70 to-transparent" />
          </div>

          <Container size="lg">
            <div className="py-20 md:py-32">
              <p className="font-medium uppercase tracking-widest text-sm text-amber-300">
                {destino.region ?? destino.provincia} · {destino.pais}
              </p>
              <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight drop-shadow-lg">
                {destino.nombre}
              </h1>
              {destino.descripcion_corta && (
                <p className="mt-6 max-w-2xl text-lg md:text-xl text-white/90 drop-shadow">
                  {destino.descripcion_corta}
                </p>
              )}

              <div className="mt-10 rounded-2xl bg-background/95 p-2 text-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <BuscadorBar destinoSlug={slug} variant="hero" />
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/${slug}/hospedajes`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-slate-950/40 px-4 py-2 text-white backdrop-blur transition hover:bg-slate-950/60"
                >
                  <Building2 className="h-4 w-4" />
                  Hospedajes
                </Link>
                <Link
                  href={`/${slug}/gastronomia`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-slate-950/40 px-4 py-2 text-white backdrop-blur transition hover:bg-slate-950/60"
                >
                  <Utensils className="h-4 w-4" />
                  Gastronomía
                </Link>
                <Link
                  href={`/${slug}/atractivos`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-slate-950/40 px-4 py-2 text-white backdrop-blur transition hover:bg-slate-950/60"
                >
                  <Camera className="h-4 w-4" />
                  Atractivos
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Promos del destino — banda con toggle de vertical (solo si hay) */}
        <DestinoPromos promos={promos} destinoNombre={destino.nombre} />

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
