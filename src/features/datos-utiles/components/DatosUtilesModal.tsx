"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import type { Rubro, DatoUtil } from "@/lib/types";
import { RubroModal } from "./RubroModal";

interface DatosUtilesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
}

export function DatosUtilesModal({
  isOpen,
  onOpenChange,
  rubros,
  datosUtiles,
}: DatosUtilesModalProps) {
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);

  const selectedRubro = rubros.find((r) => r.id === selectedRubroId);
  const rubroItems = datosUtiles.filter((d) => d.rubro_id === selectedRubroId);

  if (selectedRubroId && selectedRubro) {
    return (
      <RubroModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        rubro={selectedRubro}
        items={rubroItems}
        onBack={() => setSelectedRubroId(null)}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Datos útiles</DialogTitle>
          <DialogDescription>
            Información importante para tu visita
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {rubros.map((rubro) => (
            <Button
              key={rubro.id}
              variant="outline"
              className="justify-between"
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
      </DialogContent>
    </Dialog>
  );
}
