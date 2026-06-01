import Image from "next/image";
import Link from "next/link";
import { Users, Bed, Eye, Flame, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnidadAmenitiesList } from "./UnidadAmenitiesList";
import {
  CALEFACCION_TIPO_LABEL,
  type CalefaccionTipo,
} from "@/config/amenities-unidad";
import { getFotoUrl } from "@/lib/storage";
import type {
  UnidadTypeRow,
  UnidadTypeFotoRow,
  UnidadRow,
} from "@/types/database";

interface Props {
  tipo: UnidadTypeRow & {
    fotos?: UnidadTypeFotoRow[];
    foto_principal?: UnidadTypeFotoRow | null;
    unidades: Pick<UnidadRow, "id" | "activa">[];
  };
  /** Si se pasa, la card linkea al detalle de unidad. Browse sin fechas. */
  destinoSlug?: string;
  hospedajeSlug?: string;
  /** Query string (sin '?') a propagar al link de la unidad (fechas/pax). */
  query?: string;
}

export function UnidadCard({ tipo, destinoSlug, hospedajeSlug, query }: Props) {
  const principal =
    tipo.foto_principal ??
    (tipo.fotos
      ? tipo.fotos.find((f) => f.es_principal) ?? tipo.fotos[0]
      : null);
  const fotoUrl = principal
    ? getFotoUrl(principal.storage_path)
    : getFotoUrl("placeholders/apart-1.jpg");
  const capacidadTotal =
    (tipo.capacidad_adultos ?? 0) + (tipo.capacidad_ninos ?? 0);
  const unidadesActivas = tipo.unidades.filter((u) => u.activa).length;

  const calefaccionLabel = tipo.calefaccion_tipo
    ? CALEFACCION_TIPO_LABEL[tipo.calefaccion_tipo as CalefaccionTipo]
    : null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] w-full bg-muted">
        <Image
          src={fotoUrl}
          alt={principal?.alt ?? tipo.nombre}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover"
        />
        {unidadesActivas > 1 && (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 inline-flex items-center gap-1"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            {unidadesActivas} unidades
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="font-display text-xl leading-tight tracking-tight">
            {tipo.nombre}
          </h3>
          {tipo.descripcion && (
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              {tipo.descripcion}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {capacidadTotal > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Capacidad</dt>
                <dd className="font-medium">
                  {capacidadTotal} {capacidadTotal === 1 ? "persona" : "personas"}
                  {tipo.capacidad_ninos > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({tipo.capacidad_adultos} adultos
                      {tipo.capacidad_ninos > 0 &&
                        ` + ${tipo.capacidad_ninos} niños`}
                      )
                    </span>
                  )}
                </dd>
              </div>
            </div>
          )}
          {tipo.camas_descripcion && (
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Camas</dt>
                <dd className="font-medium">{tipo.camas_descripcion}</dd>
              </div>
            </div>
          )}
          {tipo.vista && (
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Vista</dt>
                <dd className="font-medium">{tipo.vista}</dd>
              </div>
            </div>
          )}
          {calefaccionLabel && (
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <dt className="text-xs text-muted-foreground">Calefacción</dt>
                <dd className="font-medium">{calefaccionLabel}</dd>
              </div>
            </div>
          )}
        </dl>

        {tipo.amenities.length > 0 && (
          <UnidadAmenitiesList amenities={tipo.amenities} max={8} />
        )}

        {destinoSlug && hospedajeSlug && (
          <div className="mt-auto pt-3">
            <Link
              href={`/${destinoSlug}/hospedajes/${hospedajeSlug}/unidades/${tipo.id}${query ? `?${query}` : ""}`}
              className="block"
            >
              <Button size="sm" variant="outline" className="w-full">
                Ver detalle y consultar
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
