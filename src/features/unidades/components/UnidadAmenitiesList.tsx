import { UNIDAD_AMENITIES, type UnidadAmenityKey } from "@/config/amenities-unidad";
import { cn } from "@/lib/utils";

interface Props {
  amenities: UnidadAmenityKey[] | string[];
  max?: number;
  className?: string;
}

/**
 * Render compacto de amenities de UNIDAD (catalogo separado del de hospedaje).
 * Usado en cards publicas de tipo de unidad — variant compact only.
 */
export function UnidadAmenitiesList({ amenities, max, className }: Props) {
  const valid = amenities
    .map((key) => UNIDAD_AMENITIES[key as UnidadAmenityKey])
    .filter(Boolean);
  const visible = max ? valid.slice(0, max) : valid;
  const overflow = max && valid.length > max ? valid.length - max : 0;

  if (visible.length === 0) return null;

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
    >
      {visible.map((a) => {
        const Icon = a.icon;
        return (
          <li
            key={a.key}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title={a.label}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{a.label}</span>
          </li>
        );
      })}
      {overflow > 0 && (
        <li className="text-xs font-medium text-muted-foreground">
          +{overflow} más
        </li>
      )}
    </ul>
  );
}
