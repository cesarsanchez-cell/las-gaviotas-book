import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { DestinoHeader } from "@/components/layout/DestinoHeader";
import { Footer } from "@/components/layout/Footer";
import { BuscadorBar } from "@/features/busqueda/components/BuscadorBar";
import { UnidadResultCard } from "@/features/busqueda/components/UnidadResultCard";
import { getDestinoBySlug } from "@/features/hospedajes/lib/queries";
import { searchUnidadesPorDestino } from "@/features/busqueda/lib/queries";
import { resolvePreciosBatch } from "@/features/tarifas/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ destino: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseIntInRange(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isValidISO(s: string | undefined): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) return {};
  return {
    title: `Buscar disponibilidad en ${destino.nombre}`,
    description: `Encontrá cabañas, aparts y casas disponibles en ${destino.nombre} según tus fechas y cantidad de huéspedes.`,
    alternates: { canonical: `/${slug}/buscar` },
    robots: { index: false, follow: true },
  };
}

export default async function BuscarPage({ params, searchParams }: PageProps) {
  const { destino: slug } = await params;
  const destino = await getDestinoBySlug(slug);
  if (!destino) notFound();

  // Cargar si el destino tiene restricciones habilitadas
  const sb = createAdminClient();
  const { data: destinoData } = await sb
    .from("destinos")
    .select("restricciones_habilitadas")
    .eq("id", destino.id)
    .maybeSingle<{ restricciones_habilitadas: boolean }>();
  const restriccionesHabilitadas =
    destinoData?.restricciones_habilitadas ?? false;

  const sp = await searchParams;
  const rawCheckIn = pickString(sp.check_in);
  const rawCheckOut = pickString(sp.check_out);
  const rawAdultos = pickString(sp.adultos);
  const rawNinos = pickString(sp.ninos);
  const rawBebes = pickString(sp.bebes);

  const today = todayISO();
  const checkIn =
    isValidISO(rawCheckIn) && rawCheckIn! >= today ? rawCheckIn! : today;
  const checkOutCandidate =
    isValidISO(rawCheckOut) && rawCheckOut! > checkIn
      ? rawCheckOut!
      : tomorrowISO();
  // Garantizar que checkOut > checkIn aunque hayan venido params incoherentes.
  const checkOut =
    checkOutCandidate > checkIn
      ? checkOutCandidate
      : new Date(new Date(checkIn).getTime() + 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

  const adultos = parseIntInRange(rawAdultos, 1, 20, 2);
  const ninos = parseIntInRange(rawNinos, 0, 20, 0);
  const bebes = parseIntInRange(rawBebes, 0, 10, 0);

  // Solo lanzamos la búsqueda si recibimos parámetros válidos (al menos
  // check_in en URL). En primera carga "limpia" mostramos el buscador sin
  // resultados — para no listar todo apenas entran.
  const tieneBusqueda = !!rawCheckIn;
  const resultados = tieneBusqueda
    ? await searchUnidadesPorDestino(
        destino.id,
        checkIn,
        checkOut,
        adultos + ninos
      )
    : [];

  // Resolver precios en batch para todos los resultados.
  const preciosMap = tieneBusqueda
    ? await resolvePreciosBatch(
        resultados.map((r) => r.unidad_type_id),
        checkIn,
        checkOut
      )
    : new Map();

  const noches = Math.max(
    1,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );

  const queryString = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    adultos: String(adultos),
    ninos: String(ninos),
    bebes: String(bebes),
  }).toString();

  return (
    <>
      <DestinoHeader
        destinoSlug={slug}
        destinoNombre={destino.nombre}
        destinoId={destino.id}
      />

      <main>
        <Section spacing="md" tone="sand">
          <Container size="xl">
            <header className="mb-6">
              <p className="text-sm text-muted-foreground">{destino.nombre}</p>
              <h1 className="mt-1 font-display text-3xl md:text-4xl tracking-tight">
                Buscar disponibilidad
              </h1>
            </header>
            <BuscadorBar
              destinoSlug={slug}
              defaultCheckIn={checkIn}
              defaultCheckOut={checkOut}
              defaultAdultos={adultos}
              defaultNinos={ninos}
              defaultBebes={bebes}
              variant="hero"
            />
          </Container>
        </Section>

        <Section spacing="lg">
          <Container size="xl">
            {!tieneBusqueda ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <p className="font-display text-xl">
                  {restriccionesHabilitadas
                    ? "Consultá directamente con los hospedajes para conocer disponibilidad."
                    : "Elegí fechas y cantidad de huéspedes para ver opciones."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {restriccionesHabilitadas
                    ? "Los precios y fechas se definen por hospedaje, no centralizadamente."
                    : "Te mostramos las unidades disponibles ordenadas por capacidad y destacadas primero."}
                </p>
              </div>
            ) : (
              <>
                <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl tracking-tight">
                      {resultados.length === 0
                        ? restriccionesHabilitadas
                          ? "No encontramos hospedajes con esos criterios"
                          : "No encontramos opciones"
                        : restriccionesHabilitadas
                          ? resultados.length === 1
                            ? "1 hospedaje encontrado"
                            : `${resultados.length} hospedajes encontrados`
                          : resultados.length === 1
                            ? "1 opción disponible"
                            : `${resultados.length} opciones disponibles`}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {checkIn} → {checkOut} · {noches}{" "}
                      {noches === 1 ? "noche" : "noches"} ·{" "}
                      {adultos + ninos}{" "}
                      {adultos + ninos === 1 ? "huésped" : "huéspedes"}
                      {bebes > 0 && (
                        <>
                          {" + "}
                          {bebes} {bebes === 1 ? "bebé" : "bebés"}
                        </>
                      )}
                    </p>
                  </div>
                </header>

                {resultados.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                    <p className="font-display text-lg">
                      {restriccionesHabilitadas
                        ? "No encontramos hospedajes con esos criterios de capacidad."
                        : "Probá ampliando las fechas o reduciendo huéspedes."}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Podés ver el{" "}
                      <a
                        href={`/${slug}/hospedajes`}
                        className="font-medium text-primary hover:underline"
                      >
                        listado completo de hospedajes
                      </a>{" "}
                      y{" "}
                      {restriccionesHabilitadas
                        ? "contactar directamente para consultar disponibilidad."
                        : "mandar una consulta directa."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {resultados.map((r, i) => (
                      <UnidadResultCard
                        key={r.unidad_type_id}
                        destinoSlug={slug}
                        resultado={r}
                        precio={preciosMap.get(r.unidad_type_id) ?? null}
                        queryString={queryString}
                        priority={i === 0}
                        restriccionesHabilitadas={restriccionesHabilitadas}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
