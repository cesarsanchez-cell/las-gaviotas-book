import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { getHeaderSession } from "@/features/home/lib/header-session";
import {
  listVerticalItemsRed,
  listDestinosPublicados,
  listRegionesVisibles,
  type VerticalItem,
  type VerticalKey,
} from "@/features/home/lib/queries";
import { HubV2 } from "@/features/home/components/HubV2";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Mis Escapadas — Red de portales turísticos locales",
  description:
    "Hospedajes, gastronomía y atractivos verificados por la comunidad de cada destino. Reservá directo con el dueño, sin intermediarios.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Mis Escapadas — Red de portales turísticos locales",
    description:
      "Cada destino con su propio portal, hospedajes y lugares validados por la comunidad local.",
    url: "/",
    type: "website",
  },
};

export default async function HubPage() {
  const session = await getHeaderSession();

  // Regla de hub: necesitamos saber qué destinos están publicados (activos +
  // ≥1 hospedaje publicado) antes de decidir qué mostrar.
  const destinos = await listDestinosPublicados();

  // 0 destinos → pantalla de "preparando". 1 destino → entramos directo a él.
  if (destinos.length === 0) {
    return <EmptyHub />;
  }
  if (destinos.length === 1) {
    redirect(`/${destinos[0].slug}`);
  }

  const [hospedajes, gastronomia, atractivos, regiones] = await Promise.all([
    listVerticalItemsRed("hospedajes"),
    listVerticalItemsRed("gastronomia"),
    listVerticalItemsRed("atractivos"),
    listRegionesVisibles(destinos),
  ]);

  const verticalData: Record<VerticalKey, VerticalItem[]> = {
    hospedajes,
    gastronomia,
    atractivos,
  };

  return (
    <>
      <HubV2
        verticalData={verticalData}
        destinos={destinos}
        regiones={regiones}
        session={session}
      />
      <Footer />
    </>
  );
}

/** Hub sin destinos publicados todavía. */
function EmptyHub() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="container">
          <div className="flex h-16 items-center">
            <Link href="/" className="font-display text-xl tracking-tight">
              <span className="wordmark-mis">Mis</span>{" "}
              <span className="wordmark-esc">Escapadas</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex min-h-[60vh] items-center">
        <div className="container max-w-xl text-center">
          <h1 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
            Estamos preparando los primeros destinos
          </h1>
          <p className="mt-3 text-muted-foreground">
            {siteConfig.name} está sumando hospedajes y lugares verificados por
            la comunidad local. Volvé pronto.
          </p>
          <Link
            href="/registro"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            ¿Sos comerciante? Sumá tu propuesta
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
