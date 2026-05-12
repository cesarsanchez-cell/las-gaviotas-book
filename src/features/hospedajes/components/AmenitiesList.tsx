import { AMENITIES, type AmenityKey } from "@/config/amenities";
import { cn } from "@/lib/utils";

interface AmenitiesListProps {
  amenities: AmenityKey[] | string[];
  /** Cuántas mostrar como máximo. Si hay más se muestra "+N más". */
  max?: number;
  variant?: "compact" | "grid";
  className?: string;
}

export function AmenitiesList({
  amenities,
  max,
  variant = "compact",
  className,
}: AmenitiesListProps) {
  const valid = amenities
    .map((key) => AMENITIES[key as AmenityKey])
    .filter(Boolean);

  const visible = max ? valid.slice(0, max) : valid;
  const overflow = max && valid.length > max ? valid.length - max : 0;

  if (variant === "grid") {
    return (
      <ul
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3",
          className
        )}
      >
        {visible.map((a) => {
          const Icon = a.icon;
          return (
            <li
              key={a.key}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <span>{a.label}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
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
