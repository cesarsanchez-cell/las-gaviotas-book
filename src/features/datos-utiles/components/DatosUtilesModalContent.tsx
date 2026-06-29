"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, MapPin, Phone, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Rubro, DatoUtil } from "@/lib/types";

function getMapsUrl(nombre: string, direccion?: string | null): string {
  const query = direccion ? `${nombre} ${direccion}` : nombre;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
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
    <div className="p-4">
      {selectedRubroId && selectedRubro ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedRubroId(null)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </button>

          <div>
            <h3 className="font-semibold">{selectedRubro.nombre}</h3>
            <p className="text-xs text-muted-foreground">
              {selectedRubro.descripcion}
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rubroItems.map((item) => (
              <Card key={item.id} className="p-3">
                <h4 className="font-semibold text-sm mb-2">{item.nombre}</h4>
                {item.direccion && (
                  <div className="mb-1">
                    <a
                      href={getMapsUrl(item.nombre, item.direccion)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2 items-start text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{item.direccion}</span>
                      <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    </a>
                  </div>
                )}
                {item.contacto && (
                  <div className="flex gap-2 items-start text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{item.contacto}</span>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Información importante para tu visita
          </p>
          {rubros.map((rubro) => (
            <Button
              key={rubro.id}
              variant="outline"
              className="w-full justify-between"
              onClick={() => setSelectedRubroId(rubro.id)}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                {rubro.nombre}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
