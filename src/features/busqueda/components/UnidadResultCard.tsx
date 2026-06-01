import Image from "next/image";
import Link from "next/link";
import { Users, Bed, MapPin, Building2, Eye, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnidadAmenitiesList } from "@/features/unidades/components/UnidadAmenitiesList";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import {
  CALEFACCION_TIPO_LABEL,
  type CalefaccionTipo,
} from "@/config/amenities-unidad";
import { getFotoUrl } from "@/lib/storage";
import type { UnidadResultado } from "../lib/types";
import type { PrecioPorRango } from "@/features/tarifas/lib/queries";

interface Props {
  destinoSlug: string;
  resultado: UnidadResultado;
  /** Precio resuelto para el rango buscado. NULL si no hay tarifa cargada. */
  precio?: PrecioPorRango | null;
  /** Query string para pasar fechas/pax al detalle (preserva contexto). */
  queryString?: string;
  priority?: boolean;
}

function formatMoneda(n: number, moneda: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(n);
}

export function UnidadResultCard({
  destinoSlug,
  resultado: r,
  precio,
  queryString,
  priority = false,
}: Props) {
  const principal = r.fotos.find((f) => f.es_principal) ?? r.fotos[0];
  const fotoUrl = principal
    ? getFotoUrl(principal.storage_path)
    : getFotoUrl("placeholders/apart-1.jpg");

  const calefaccionLabel = r.calefaccion_tipo
    ? CALEFACCION_TIPO_LABEL[r.calefaccion_tipo as CalefaccionTipo]
    : null;

  const detalleHref = `/${destinoSlug}/hospedajes/${r.hospedaje.slug}/unidades/${r.unidad_type_id}${queryString ? `?${queryString}` : ""}`;

  return (
    <Card className="flex flex-col overflow-hidden md:flex-row">
      <Link
        href={detalleHref}
        className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted md:aspect-auto md:h-auto md:w-64"
        aria-label={`Ver ${r.nombre}`}
      >
        <Image
          src={fotoUrl}
          alt={principal?.alt ?? r.nombre}
          fill
          sizes="(max-width: 768px) 100vw, 256px"
          priority={priority}
          className="object-cover"
        />
        {r.unidades_totales > 1 && (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 inline-flex items-center gap-1"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {r.unidades_libres} de {r.unidades_totales} libres
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <Badge variant="secondary" className="text-[10px]">
            {TIPO_HOSPEDAJE_LABEL[r.hospedaje.tipo]}
          </Badge>
          <h3 className="mt-2 font-display text-xl leading-tight tracking-tight">
            {r.nombre}
          </h3>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="line-clamp-1">{r.hospedaje.nombre}</span>
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-1">{r.hospedaje.direccion}</span>
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {r.capacidad_total > 0 && (
            <div className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              <span className="font-medium">
                {r.capacidad_total}{" "}
                {r.capacidad_total === 1 ? "persona" : "personas"}
              </span>
            </div>
          )}
          {r.camas_descripcion && (
            <div className="inline-flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-primary" aria-hidden />
              <span>{r.camas_descripcion}</span>
            </div>
          )}
          {r.vista && (
            <div className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" aria-hidden />
              <span>{r.vista}</span>
            </div>
          )}
          {calefaccionLabel && (
            <div className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-primary" aria-hidden />
              <span>{calefaccionLabel}</span>
            </div>
          )}
        </dl>

        {r.amenities.length > 0 && (
          <UnidadAmenitiesList amenities={r.amenities} max={6} />
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          {precio && precio.total !== null && precio.moneda ? (
            <div>
              <p className="font-display text-xl tracking-tight">
                {formatMoneda(precio.total, precio.moneda)}
              </p>
              <p className="text-xs text-muted-foreground">
                {precio.noches}{" "}
                {precio.noches === 1 ? "noche" : "noches"} ·{" "}
                {formatMoneda(precio.total / precio.noches, precio.moneda)} / noche
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {precio && !precio.coberturaCompleta && precio.desglose.length > 0
                ? "Tarifa parcial — consultá al responsable por el total."
                : "Precio a consultar — el responsable te confirma según las fechas."}
            </p>
          )}
          <Link href={detalleHref} className="ml-auto">
            <Button size="sm">Ver detalle</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
