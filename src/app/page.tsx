import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Footer } from "@/components/layout/Footer";
import { listActiveDestinosWithCounts } from "@/features/hospedajes/lib/queries";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Mis Escapadas — Red de portales turísticos locales",
  description:
    "Hospedajes verificados por la comunidad de cada destino. Reservá directo con el dueño, sin intermediarios.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mis Escapadas — Red de portales turísticos locales",
    description:
      "Cada destino con su propio portal, hospedajes validados por la comunidad local.",
    url: "/",
    type: "website",
  },
};

export default async function HubPage() {
  const destinos = await listActiveDestinosWithCounts();

  // Mientras solo hay un destino activo, redirigimos transparente para no
  // mostrar un hub casi vacío. Cuando haya 2+ destinos, el hub se renderiza
  // como selector.
  if (destinos.length === 1) {
    const { redirect } = await import("next/navigation");
    redirect(`/${destinos[0].slug}`);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Container size="xl">
          <div className="flex h-16 items-center">
            <Link
              href="/"
              className="font-display text-xl tracking-tight text-foreground"
              aria-label={`${siteConfig.name} — red de portales turísticos locales`}
            >
              {siteConfig.shortName}
            </Link>
          </div>
        </Container>
      </header>

      <main>
        <Section spacing="xl" tone="sand">
          <Container size="lg">
            <p className="font-medium uppercase tracking-widest text-sm text-primary">
              Red de portales turísticos locales
            </p>
            <h1 className="mt-4 font-display text-5xl md:text-7xl tracking-tight text-foreground">
              Mis Escapadas
            </h1>
            <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
              Cada destino es una comunidad propia que valida sus hospedajes.
              Elegí a dónde querés escaparte.
            </p>
          </Container>
        </Section>

        <Section spacing="lg">
          <Container size="xl">
            {destinos.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Estamos preparando los primeros destinos. Volvé pronto.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {destinos.map((destino) => (
                  <Link
                    key={destino.id}
                    href={`/${destino.slug}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" aria-hidden />
                      <span>
                        {destino.region ?? destino.provincia} · {destino.pais}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground">
                      Mis Escapadas a {destino.nombre}
                    </h2>
                    {destino.descripcion_corta && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-3">
                        {destino.descripcion_corta}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-6">
                      <span className="text-sm text-muted-foreground">
                        {destino.hospedajes_publicados === 1
                          ? "1 hospedaje verificado"
                          : `${destino.hospedajes_publicados} hospedajes verificados`}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                    </div>
                  </Link>
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
