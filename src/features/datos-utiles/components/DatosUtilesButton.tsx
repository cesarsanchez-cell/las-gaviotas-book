"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { DatosUtilesModal } from "./DatosUtilesModal";
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

      <DatosUtilesModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        rubros={rubrosConItems}
        datosUtiles={datosUtiles}
      />
    </>
  );
}
