import Image from "next/image";
import Link from "next/link";
import { MapPin, Users, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AmenitiesList } from "./AmenitiesList";
import { ValidationBadge } from "./ValidationBadge";
import { WhatsAppButton } from "./WhatsAppButton";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import { getFotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { AmenityKey } from "@/config/amenities";
import type { TipoHospedaje } from "@/types/domain";

interface HospedajeCardProps {
  destinoSlug: string;
  hospedaje: {
    slug: string;
    nombre: string;
    tipo: TipoHospedaje;
    descripcion_corta: string;
    direccion: string;
    capacidad_max?: number | null;
    cantidad_unidades?: number | null;
    amenities: AmenityKey[] | string[];
    destacado: boolean;
    foto_principal_path?: string;
    foto_alt?: string;
    whatsapp: string;
  };
  className?: string;
  priority?: boolean;
}

export function HospedajeCard({
  destinoSlug,
  hospedaje,
  className,
  priority = false,
}: HospedajeCardProps) {
  const href = `/${destinoSlug}/hospedajes/${hospedaje.slug}`;
  const fotoUrl = hospedaje.foto_principal_path
    ? getFotoUrl(hospedaje.foto_principal_path)
    : getFotoUrl("placeholders/apart-1.jpg");

  return (
    <Card
      className={cn(
        "group flex flex-col transition-shadow duration-200 hover:shadow-lg",
        className
      )}
    >
      <Link
        href={href}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted"
        aria-label={`Ver detalles de ${hospedaje.nombre}`}
      >
        <Image
          src={fotoUrl}
          alt={hospedaje.foto_alt ?? hospedaje.nombre}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {hospedaje.destacado && (
            <Badge variant="featured">Destacado</Badge>
          )}
          <ValidationBadge />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate font-display text-xl leading-tight tracking-tight text-foreground group-hover:text-primary">
              {hospedaje.nombre}
            </h3>
          </Link>
          <Badge variant="secondary" className="shrink-0">
            {TIPO_HOSPEDAJE_LABEL[hospedaje.tipo]}
          </Badge>
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {hospedaje.descripcion_corta}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            <span className="line-clamp-1">{hospedaje.direccion}</span>
          </span>
          {hospedaje.capacidad_max && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden />
              hasta {hospedaje.capacidad_max} personas
            </span>
          )}
          {hospedaje.cantidad_unidades && hospedaje.cantidad_unidades > 1 && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden />
              {hospedaje.cantidad_unidades} unidades
            </span>
          )}
        </div>

        <AmenitiesList amenities={hospedaje.amenities} max={5} />

        <div className="mt-auto pt-3">
          <WhatsAppButton
            whatsapp={hospedaje.whatsapp}
            hospedajeNombre={hospedaje.nombre}
            size="sm"
            fullWidth
          />
        </div>
      </div>
    </Card>
  );
}
