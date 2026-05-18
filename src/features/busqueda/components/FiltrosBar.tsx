"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AMENITIES, type AmenityKey } from "@/config/amenities";
import { TIPOS_VALIDOS } from "@/features/busqueda/lib/filters";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import { cn } from "@/lib/utils";

interface FiltrosBarProps {
  className?: string;
}

const AMENITIES_FILTRABLES: AmenityKey[] = [
  "wifi_areas_comunes",
  "cerca_del_mar",
  "estacionamiento",
  "piscina",
  "parrillas_compartidas",
  "pet_friendly",
  "juegos_para_ninos",
  "parque",
];

export function FiltrosBar({ className }: FiltrosBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const tipo = sp.get("tipo") ?? "";
  const capacidad = sp.get("capacidad") ?? "";
  const amenities = (sp.get("amenities") ?? "")
    .split(",")
    .filter(Boolean) as AmenityKey[];

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const toggleAmenity = (key: AmenityKey) => {
    const current = new Set(amenities);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    update("amenities", current.size > 0 ? Array.from(current).join(",") : null);
  };

  const clearAll = () => router.push(pathname, { scroll: false });

  const activeCount =
    (tipo ? 1 : 0) + (capacidad ? 1 : 0) + amenities.length;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 md:hidden"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default">{activeCount}</Badge>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </button>

      <div className={cn("space-y-5 md:block", open ? "mt-4 block" : "hidden")}>
        {/* Tipo */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => update("tipo", null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                !tipo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              )}
            >
              Todos
            </button>
            {TIPOS_VALIDOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update("tipo", tipo === t ? null : t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  tipo === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground"
                )}
              >
                {TIPO_HOSPEDAJE_LABEL[t]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Capacidad */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Capacidad mínima</legend>
          <div className="flex flex-wrap gap-2">
            {[2, 4, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() =>
                  update("capacidad", capacidad === String(n) ? null : String(n))
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  capacidad === String(n)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground"
                )}
              >
                {n}+ personas
              </button>
            ))}
          </div>
        </fieldset>

        {/* Amenities */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Amenities</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITIES_FILTRABLES.map((key) => {
              const a = AMENITIES[key];
              const active = amenities.includes(key);
              const Icon = a.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAmenity(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {a.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {activeCount > 0 && (
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
