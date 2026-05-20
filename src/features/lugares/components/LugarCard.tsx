import Image from "next/image";
import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFotoUrl } from "@/lib/storage";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import { cn } from "@/lib/utils";
import type { LugarCard as LugarCardData } from "@/features/lugares/lib/queries";

interface LugarCardProps {
  destinoSlug: string;
  lugar: LugarCardData;
  className?: string;
  priority?: boolean;
}

export function LugarCard({
  destinoSlug,
  lugar,
  className,
  priority = false,
}: LugarCardProps) {
  const subruta = lugar.tipo === "gastronomico" ? "gastronomia" : "atractivos";
  const href = `/${destinoSlug}/${subruta}/${lugar.slug}`;
  const fotoUrl = lugar.foto_principal_path
    ? getFotoUrl(lugar.foto_principal_path)
    : getFotoUrl("placeholders/apart-1.jpg");

  const categoriaLabel = getCategoriaLabel(lugar.tipo, lugar.categoria);

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
        aria-label={`Ver detalles de ${lugar.nombre}`}
      >
        <Image
          src={fotoUrl}
          alt={lugar.foto_alt ?? lugar.nombre}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {lugar.imperdible && (
            <Badge
              variant="featured"
              className="inline-flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Imperdible
            </Badge>
          )}
          {lugar.destacado && !lugar.imperdible && (
            <Badge variant="featured">Destacado</Badge>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate font-display text-xl leading-tight tracking-tight text-foreground group-hover:text-primary">
              {lugar.nombre}
            </h3>
          </Link>
          {categoriaLabel && (
            <Badge variant="secondary" className="shrink-0">
              {categoriaLabel}
            </Badge>
          )}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {lugar.descripcion_corta}
        </p>

        {lugar.direccion && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              <span className="line-clamp-1">{lugar.direccion}</span>
            </span>
          </div>
        )}

        <div className="mt-auto pt-2">
          <Link
            href={href}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
      </div>
    </Card>
  );
}
