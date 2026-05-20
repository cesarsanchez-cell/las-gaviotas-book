import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LugarCard } from "@/features/lugares/components/LugarCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDestinoBySlug } from "@/features/hospedajes/lib/queries";
import { listLugaresByDestino } from "@/features/lugares/lib/queries";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import {
  CATEGORIAS_ATRACTIVO,
  CATEGORIAS_ATRACTIVO_KEYS,
  isCategoriaAtractivo,
} from "@/config/categorias-lugar";

interface PageProps {
  params: Promise<{ destino: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) return {};

  return {
    title: `Atractivos en ${destino.nombre}`,
    description: `Playas, bosques, miradores, senderos y atractivos imperdibles en ${destino.nombre}. Información local curada por la comunidad.`,
    alternates: { canonical: `/${slug}/atractivos` },
  };
}

export default async function AtractivosListPage({
  params,
  searchParams,
}: PageProps) {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) notFound();

  const sp = await searchParams;
  const catParam = typeof sp.categoria === "string" ? sp.categoria : undefined;
  const categoriaActiva =
    catParam && isCategoriaAtractivo(catParam) ? catParam : undefined;

  const lugares = await listLugaresByDestino(destino.id, {
    tipo: "atractivo",
    categoria: categoriaActiva,
  });

  return (
    <>
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Inicio", url: "/" },
          { name: destino.nombre, url: `/${slug}` },
          { name: "Atractivos", url: `/${slug}/atractivos` },
        ])}
      />

      <Header destinoSlug={slug} destinoNombre={destino.nombre} />

      <main>
        <Section spacing="md">
          <Container size="xl">
            <header className="mb-8">
              <p className="text-sm text-muted-foreground">{destino.nombre}</p>
              <h1 className="mt-1 inline-flex items-center gap-3 font-display text-4xl md:text-5xl tracking-tight">
                <Camera
                  className="h-8 w-8 text-muted-foreground"
                  aria-hidden
                />
                Atractivos
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Lo que la comunidad de {destino.nombre} recomienda hacer y
                visitar. De playas y senderos hasta espectáculos a la gorra.
              </p>
            </header>

            <div className="-mx-1 mb-8 flex flex-wrap gap-2">
              <Link
                href={`/${slug}/atractivos`}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  !categoriaActiva
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-muted"
                }`}
              >
                Todos
              </Link>
              {CATEGORIAS_ATRACTIVO_KEYS.map((key) => {
                const def = CATEGORIAS_ATRACTIVO[key];
                const active = categoriaActiva === key;
                return (
                  <Link
                    key={key}
                    href={`/${slug}/atractivos?categoria=${key}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <def.icon className="h-3.5 w-3.5" aria-hidden />
                    {def.label}
                  </Link>
                );
              })}
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              {lugares.length}{" "}
              {lugares.length === 1 ? "resultado" : "resultados"}
            </p>

            {lugares.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <p className="font-display text-xl">
                  Todavía no hay atractivos publicados en esta categoría.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Probá con otra categoría o volvé a la lista completa.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lugares.map((l, i) => (
                  <LugarCard
                    key={l.id}
                    destinoSlug={slug}
                    lugar={l}
                    priority={i < 2}
                  />
                ))}
              </div>
            )}
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
