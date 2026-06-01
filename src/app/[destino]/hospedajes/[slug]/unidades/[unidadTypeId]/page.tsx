import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronLeft,
  Users,
  Bed,
  Eye,
  Flame,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { DestinoHeader } from "@/components/layout/DestinoHeader";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { UnidadGallery } from "@/features/unidades/components/UnidadGallery";
import { UnidadAmenitiesList } from "@/features/unidades/components/UnidadAmenitiesList";
import { AmenitiesList } from "@/features/hospedajes/components/AmenitiesList";
import { DisponibilidadPublica } from "@/features/disponibilidad/components/DisponibilidadPublica";
import { ConsultaUnidadForm } from "@/features/consultas/components/ConsultaUnidadForm";
import {
  listDiasBloqueados,
  aggregateFullBlockPorTipo,
} from "@/features/disponibilidad/lib/queries";
import { getUnidadType } from "@/features/unidades/lib/queries";
import {
  getDestinoBySlug,
  getHospedajeBySlug,
} from "@/features/hospedajes/lib/queries";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import {
  CALEFACCION_TIPO_LABEL,
  type CalefaccionTipo,
} from "@/config/amenities-unidad";
import {
  OPERATIONAL_AMENITIES,
  OPERATIONAL_AMENITY_GROUPS,
} from "@/config/amenities-operational";
import { resolvePrecioPorRango } from "@/features/tarifas/lib/queries";
import { todayISO, tomorrowISO, addDaysISO as addDays } from "@/lib/date";

interface PageProps {
  params: Promise<{ destino: string; slug: string; unidadTypeId: string }>;
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { destino: destinoSlug, slug, unidadTypeId } = await params;
  const destino = await getDestinoBySlug(destinoSlug);
  if (!destino) return {};
  const tipo = await getUnidadType(unidadTypeId);
  if (!tipo) return {};
  return {
    title: `${tipo.nombre} — ${destino.nombre}`,
    alternates: {
      canonical: `/${destinoSlug}/hospedajes/${slug}/unidades/${unidadTypeId}`,
    },
    robots: { index: false, follow: true },
  };
}

export default async function UnidadDetallePage({
  params,
  searchParams,
}: PageProps) {
  const { destino: destinoSlug, slug, unidadTypeId } = await params;

  const [destino, sp] = await Promise.all([
    getDestinoBySlug(destinoSlug),
    searchParams,
  ]);
  if (!destino) notFound();

  const hospedaje = await getHospedajeBySlug(destino.id, slug);
  if (!hospedaje) notFound();

  const tipo = await getUnidadType(unidadTypeId);
  if (!tipo || tipo.hospedaje_id !== hospedaje.id || !tipo.activo) notFound();

  // Parseo de params del buscador. Si no vienen, default hoy → mañana.
  const today = todayISO();
  const rawCi = pickString(sp.check_in);
  const rawCo = pickString(sp.check_out);
  const checkIn = isValidISO(rawCi) && rawCi! >= today ? rawCi! : today;
  const checkOutRaw =
    isValidISO(rawCo) && rawCo! > checkIn ? rawCo! : tomorrowISO();
  const checkOut = checkOutRaw > checkIn ? checkOutRaw : addDays(checkIn, 1);

  const adultos = parseIntInRange(pickString(sp.adultos), 1, 20, 2);
  const ninos = parseIntInRange(pickString(sp.ninos), 0, 20, 0);
  const bebes = parseIntInRange(pickString(sp.bebes), 0, 10, 0);

  // Disponibilidad: traemos los próximos 3 meses para el mini-cal y
  // calculamos full-block del tipo en el rango pedido para mostrar warning.
  const today3 = new Date();
  today3.setHours(0, 0, 0, 0);
  const end3 = new Date(today3);
  end3.setMonth(end3.getMonth() + 3);

  const dias = await listDiasBloqueados(
    hospedaje.id,
    today3.toISOString().slice(0, 10),
    end3.toISOString().slice(0, 10)
  );

  const unidadesActivas = tipo.unidades.filter((u) => u.activa);
  const unidadIds = unidadesActivas.map((u) => u.id);
  const fullBlockMap = aggregateFullBlockPorTipo(
    dias.filter((d) => unidadIds.includes(d.unidad_id)),
    new Map([[tipo.id, unidadIds]])
  );
  const fullBlock = fullBlockMap.get(tipo.id) ?? new Set<string>();

  // ¿Está libre todo el rango pedido?
  const rangoLibre = (() => {
    if (unidadesActivas.length === 0) return false;
    // Recorremos noche por noche [checkIn, checkOut).
    const cursor = new Date(checkIn);
    const end = new Date(checkOut);
    while (cursor < end) {
      const iso = cursor.toISOString().slice(0, 10);
      if (fullBlock.has(iso)) return false;
      cursor.setDate(cursor.getDate() + 1);
    }
    return true;
  })();

  const capacidadTotal = tipo.capacidad_adultos + tipo.capacidad_ninos;
  const cumpleCapacidad = capacidadTotal >= adultos + ninos;
  const calefaccionLabel = tipo.calefaccion_tipo
    ? CALEFACCION_TIPO_LABEL[tipo.calefaccion_tipo as CalefaccionTipo]
    : null;

  const precio = await resolvePrecioPorRango(tipo.id, checkIn, checkOut);
  const formatPrecio = (n: number, m: string) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: m,
      maximumFractionDigits: 0,
    }).format(n);

  const operationalAmenities = (hospedaje.amenities_operational ?? []).filter(
    (k) => k in OPERATIONAL_AMENITIES
  );

  // QueryString para preservar el contexto al volver atrás.
  const qs = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut,
    adultos: String(adultos),
    ninos: String(ninos),
    bebes: String(bebes),
  }).toString();

  const fotos = tipo.fotos.map((f) => ({
    storage_path: f.storage_path,
    alt: f.alt,
    es_principal: f.es_principal,
  }));

  return (
    <>
      <DestinoHeader destinoSlug={destinoSlug} destinoNombre={destino.nombre} />

      <main>
        <Container size="xl" as="article">
          <div className="py-6">
            <Link
              href={`/${destinoSlug}/buscar?${qs}`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver a los resultados
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">
                {TIPO_HOSPEDAJE_LABEL[hospedaje.tipo]}
              </Badge>
              <Link
                href={`/${destinoSlug}/hospedajes/${slug}`}
                className="hover:text-foreground hover:underline"
              >
                {hospedaje.nombre}
              </Link>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {hospedaje.direccion}
              </span>
            </div>

            <h1 className="mt-3 font-display text-4xl md:text-5xl tracking-tight">
              {tipo.nombre}
            </h1>
            {unidadesActivas.length > 1 && (
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" aria-hidden />
                {unidadesActivas.length} unidades de este tipo en el complejo
              </p>
            )}
          </div>

          <UnidadGallery fotos={fotos} unidadNombre={tipo.nombre} />

          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
            <div className="space-y-10">
              {tipo.descripcion && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Sobre esta unidad
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-relaxed">
                    {tipo.descripcion}
                  </p>
                </section>
              )}

              <section>
                <h2 className="font-display text-2xl tracking-tight">
                  Detalle
                </h2>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                    <div>
                      <dt className="text-muted-foreground">Capacidad</dt>
                      <dd className="font-medium">
                        {capacidadTotal} personas
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({tipo.capacidad_adultos} adultos
                          {tipo.capacidad_ninos > 0 &&
                            ` + ${tipo.capacidad_ninos} niños`}
                          )
                        </span>
                      </dd>
                    </div>
                  </div>
                  {tipo.camas_descripcion && (
                    <div className="flex items-start gap-2">
                      <Bed
                        className="mt-0.5 h-5 w-5 text-primary"
                        aria-hidden
                      />
                      <div>
                        <dt className="text-muted-foreground">Camas</dt>
                        <dd className="font-medium">
                          {tipo.camas_descripcion}
                        </dd>
                      </div>
                    </div>
                  )}
                  {tipo.vista && (
                    <div className="flex items-start gap-2">
                      <Eye
                        className="mt-0.5 h-5 w-5 text-primary"
                        aria-hidden
                      />
                      <div>
                        <dt className="text-muted-foreground">Vista</dt>
                        <dd className="font-medium">{tipo.vista}</dd>
                      </div>
                    </div>
                  )}
                  {calefaccionLabel && (
                    <div className="flex items-start gap-2">
                      <Flame
                        className="mt-0.5 h-5 w-5 text-primary"
                        aria-hidden
                      />
                      <div>
                        <dt className="text-muted-foreground">Calefacción</dt>
                        <dd className="font-medium">{calefaccionLabel}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </section>

              {tipo.amenities.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl tracking-tight">
                    Amenities de la unidad
                  </h2>
                  <UnidadAmenitiesList
                    amenities={tipo.amenities}
                    className="mt-4"
                  />
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
                        .map(
                          (k) =>
                            OPERATIONAL_AMENITIES[
                              k as keyof typeof OPERATIONAL_AMENITIES
                            ]
                        )
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

              <section>
                <h2 className="font-display text-2xl tracking-tight">
                  Disponibilidad
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Próximos 3 meses. En rojo, las fechas sin ninguna unidad libre
                  para este tipo.
                </p>
                <div className="mt-5 rounded-xl border border-border bg-card p-5 sm:p-6">
                  <DisponibilidadPublica
                    diasBloqueados={Array.from(fullBlock).map((fecha) => ({
                      fecha,
                    }))}
                  />
                </div>
              </section>

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
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">Tu consulta</p>
                <p className="mt-1 font-display text-lg tracking-tight">
                  {checkIn} → {checkOut}
                </p>
                <p className="text-sm text-muted-foreground">
                  {adultos} {adultos === 1 ? "adulto" : "adultos"}
                  {ninos > 0 && (
                    <>
                      , {ninos} {ninos === 1 ? "niño" : "niños"}
                    </>
                  )}
                  {bebes > 0 && (
                    <>
                      , {bebes} {bebes === 1 ? "bebé" : "bebés"}
                    </>
                  )}
                </p>

                {!cumpleCapacidad && (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Esta unidad declara capacidad para {capacidadTotal}{" "}
                    personas. Vos buscaste {adultos + ninos}. Podés consultar
                    igualmente y ver con el responsable.
                  </div>
                )}
                {!rangoLibre && (
                  <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                    Las fechas elegidas no tienen unidades libres en este tipo.
                    Podés consultar igualmente — el responsable puede tener
                    opciones cercanas.
                  </div>
                )}

                {precio.total !== null && precio.moneda ? (
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-2xl tracking-tight">
                        {formatPrecio(precio.total, precio.moneda)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {precio.noches}{" "}
                        {precio.noches === 1 ? "noche" : "noches"}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPrecio(
                        precio.total / precio.noches,
                        precio.moneda
                      )}{" "}
                      / noche · valor por la unidad entera
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-xs text-muted-foreground">
                    {precio.desglose.length > 0 && !precio.coberturaCompleta
                      ? "Algunas noches del rango no tienen tarifa cargada — consultá al responsable por el total."
                      : "Precio a consultar — el responsable te confirma según las fechas y la cantidad de huéspedes."}
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="font-display text-xl tracking-tight">
                  Consultar al responsable
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sin intermediarios. Recibís respuesta del alojamiento
                  directamente.
                </p>
                <div className="mt-4">
                  <ConsultaUnidadForm
                    hospedajeId={hospedaje.id}
                    unidadTypeId={tipo.id}
                    unidadNombre={tipo.nombre}
                    hospedajeNombre={hospedaje.nombre}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    adultos={adultos}
                    ninos={ninos}
                    bebes={bebes}
                  />
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </main>

      <Footer />
    </>
  );
}
