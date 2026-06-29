"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { DatosUtilesModalContent } from "./DatosUtilesModalContent";
import type { Rubro, DatoUtil } from "@/lib/types";

interface DatosUtilesButtonProps {
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
}

export function DatosUtilesButton({
  rubros,
  datosUtiles,
}: DatosUtilesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Contar items por rubro
  const rubrosCounts = new Map<string, number>();
  datosUtiles.forEach((item) => {
    const count = rubrosCounts.get(item.rubro_id) || 0;
    rubrosCounts.set(item.rubro_id, count + 1);
  });

  // Filtrar solo rubros con items
  const rubrosConItems = rubros.filter(
    (r) => rubrosCounts.has(r.id) && rubrosCounts.get(r.id)! > 0
  );

  // Si no hay rubros con items, no mostrar el botón
  if (rubrosConItems.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Menu className="h-4 w-4" />
        Datos útiles
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-96 bg-background shadow-lg overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="font-semibold">Datos útiles</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DatosUtilesModalContent
              rubros={rubrosConItems}
              datosUtiles={datosUtiles}
            />
          </div>
        </div>
      )}
    </>
  );
}
