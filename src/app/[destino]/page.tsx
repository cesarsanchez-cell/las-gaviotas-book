import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { buttonVariants } from "@/components/ui/button";
import { HospedajeCard } from "@/features/hospedajes/components/HospedajeCard";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getDestinoBySlug,
  getDestacadosByDestino,
  listHospedajesByDestino,
} from "@/features/hospedajes/lib/queries";
import { buildDestinoJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteConfig } from "@/config/site";

interface PageProps {
  params: Promise<{ destino: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) return {};

  const title = `Hospedajes en ${destino.nombre}`;
  const description =
    destino.descripcion_corta ??
    `Directorio premium de hospedajes en ${destino.nombre}.`;

  return {
    title,
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

  const [destacados, todos] = await Promise.all([
    getDestacadosByDestino(destino.id, 3),
    listHospedajesByDestino(destino.id, undefined, 9),
  ]);

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
        {/* Hero */}
        <Section spacing="xl" tone="sand">
          <Container size="lg">
            <p className="font-medium uppercase tracking-widest text-sm text-primary">
              {destino.region ?? destino.provincia} · {destino.pais}
            </p>
            <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight text-foreground">
              {destino.nombre}
            </h1>
            {destino.descripcion_corta && (
              <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
                {destino.descripcion_corta}
              </p>
            )}
            <div className="mt-8">
              <Link
                href={`/${slug}/hospedajes`}
                className={buttonVariants({ size: "lg" })}
              >
                Ver todos los hospedajes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Container>
        </Section>

        {/* Destacados */}
        {destacados.length > 0 && (
          <Section spacing="lg">
            <Container size="xl">
              <header className="mb-10">
                <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                  Destacados
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Selección curada del equipo de {siteConfig.shortName}.
                </p>
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

        {/* Todos */}
        {todos.length > 0 && (
          <Section spacing="lg" tone="muted">
            <Container size="xl">
              <header className="mb-10 flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl md:text-4xl tracking-tight">
                    Todos los hospedajes
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {todos.length} alojamientos verificados en {destino.nombre}.
                  </p>
                </div>
                <Link
                  href={`/${slug}/hospedajes`}
                  className="hidden text-sm font-medium text-primary hover:underline md:block"
                >
                  Ver listado completo →
                </Link>
              </header>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {todos.map((h) => (
                  <HospedajeCard
                    key={h.id}
                    destinoSlug={slug}
                    hospedaje={h}
                  />
                ))}
              </div>
            </Container>
          </Section>
        )}
      </main>

      <Footer />
    </>
  );
}
