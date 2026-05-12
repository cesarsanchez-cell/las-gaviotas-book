import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HospedajeCard } from "@/features/hospedajes/components/HospedajeCard";
import { FiltrosBar } from "@/features/busqueda/components/FiltrosBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { parseFiltersFromSearchParams } from "@/features/busqueda/lib/filters";
import {
  getDestinoBySlug,
  listHospedajesByDestino,
} from "@/features/hospedajes/lib/queries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface PageProps {
  params: Promise<{ destino: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) return {};

  return {
    title: `Hospedajes en ${destino.nombre}`,
    description: `Listado completo de cabañas, aparts, hosterías y casas en ${destino.nombre}. Filtrá por tipo, capacidad y servicios.`,
    alternates: { canonical: `/${slug}/hospedajes` },
  };
}

export default async function HospedajesListPage({
  params,
  searchParams,
}: PageProps) {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) notFound();

  const sp = await searchParams;
  const filters = parseFiltersFromSearchParams(sp);
  const hospedajes = await listHospedajesByDestino(destino.id, filters);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${slug}` },
          { name: "Hospedajes", url: `/${slug}/hospedajes` },
        ])}
      />

      <Header destinoSlug={slug} destinoNombre={destino.nombre} />

      <main>
        <Section spacing="md">
          <Container size="xl">
            <header className="mb-8">
              <p className="text-sm text-muted-foreground">
                {destino.nombre}
              </p>
              <h1 className="mt-1 font-display text-4xl md:text-5xl tracking-tight">
                Hospedajes
              </h1>
            </header>

            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <aside className="lg:sticky lg:top-20 lg:self-start">
                <FiltrosBar />
              </aside>

              <div>
                <p className="mb-6 text-sm text-muted-foreground">
                  {hospedajes.length}{" "}
                  {hospedajes.length === 1 ? "resultado" : "resultados"}
                </p>

                {hospedajes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                    <p className="font-display text-xl">
                      No encontramos hospedajes con esos filtros.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Probá ampliando los criterios o limpiando los filtros.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {hospedajes.map((h, i) => (
                      <HospedajeCard
                        key={h.id}
                        destinoSlug={slug}
                        hospedaje={h}
                        priority={i < 2}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
