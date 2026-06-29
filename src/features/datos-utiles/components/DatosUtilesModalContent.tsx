"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Phone,
  ExternalLink,
  Hospital,
  AlertCircle,
  Car,
  UtensilsCrossed,
  Music,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Rubro, DatoUtil } from "@/lib/types";

function getMapsUrl(nombre: string, direccion?: string | null): string {
  const query = direccion ? `${nombre} ${direccion}` : nombre;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function getIconComponent(iconName: string): LucideIcon {
  const iconMap: Record<string, LucideIcon> = {
    hospital: Hospital,
    "alert-circle": AlertCircle,
    car: Car,
    utensils: UtensilsCrossed,
    music: Music,
    "map-pin": MapPin,
  };
  return iconMap[iconName] || MapPin;
}

interface DatosUtilesModalContentProps {
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
}

export function DatosUtilesModalContent({
  rubros,
  datosUtiles,
}: DatosUtilesModalContentProps) {
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);

  const selectedRubro = rubros.find((r) => r.id === selectedRubroId);
  const rubroItems = datosUtiles.filter((d) => d.rubro_id === selectedRubroId);

  return (
    <div className="p-6">
      {selectedRubroId && selectedRubro ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedRubroId(null)}
            className="flex items-center gap-2 text-base text-primary hover:underline font-medium"
          >
            <ChevronLeft className="h-5 w-5" />
            Volver
          </button>

          <div>
            <h3 className="text-2xl font-bold mb-2">{selectedRubro.nombre}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedRubro.descripcion}
            </p>
          </div>

          <div className="space-y-3">
            {rubroItems.length === 0 ? (
              <p className="text-base text-muted-foreground py-8 text-center">
                Sin datos cargados aún en {selectedRubro.nombre}
              </p>
            ) : (
              rubroItems.map((item) => (
                <Card key={item.id} className="p-4 border-l-4 border-l-primary">
                  <h4 className="font-bold text-base mb-3">{item.nombre}</h4>
                  {item.direccion && (
                    <div className="mb-3">
                      <a
                        href={getMapsUrl(item.nombre, item.direccion)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-2 items-start text-sm text-primary hover:underline font-medium"
                      >
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{item.direccion}</span>
                        <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      </a>
                    </div>
                  )}
                  {item.contacto && (
                    <div className="flex gap-2 items-start text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{item.contacto}</span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-6">
            Información importante para tu visita
          </p>
          {rubros.map((rubro) => {
            const Icon = getIconComponent(rubro.icono_default);
            return (
              <Button
                key={rubro.id}
                variant="outline"
                className="w-full justify-between h-auto py-4 px-4 text-base font-medium"
                onClick={() => setSelectedRubroId(rubro.id)}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {rubro.nombre}
                </span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
