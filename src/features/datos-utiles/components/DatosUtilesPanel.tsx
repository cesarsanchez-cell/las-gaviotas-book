"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { Rubro, DatoUtil } from "@/lib/types";
import { DatoUtilForm } from "./DatoUtilForm";
import { RubroItems } from "./RubroItems";
import {
  crearDatoUtilAction,
  eliminarDatoUtilAction,
} from "../lib/datos-utiles-actions";

interface DatosUtilesPanelProps {
  destino_id: string;
  rubros: Rubro[];
  datosUtiles: DatoUtil[];
  itemCounts: Map<string, number>;
}

export function DatosUtilesPanel({
  destino_id,
  rubros,
  datosUtiles: initialDatos,
  itemCounts,
}: DatosUtilesPanelProps) {
  const [datosUtiles, setDatosUtiles] = useState<DatoUtil[]>(initialDatos);
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(
    rubros[0]?.id || null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (formData: {
    rubroId: string;
    nombre: string;
    direccion?: string;
    contacto?: string;
  }) => {
    setIsSaving(true);
    try {
      const newItem = await crearDatoUtilAction(destino_id, formData);
      setDatosUtiles((prev) => [
        ...prev,
        {
          id: newItem.id,
          destino_id,
          rubro_id: formData.rubroId,
          nombre: formData.nombre,
          direccion: formData.direccion,
          contacto: formData.contacto,
          foto_path: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsCreateModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (datoUtilId: string) => {
    if (!confirm("¿Eliminar este dato?")) return;
    try {
      await eliminarDatoUtilAction(datoUtilId);
      setDatosUtiles((prev) => prev.filter((d) => d.id !== datoUtilId));
    } catch {
      alert("Error al eliminar");
    }
  };

  const selectedRubro = rubros.find((r) => r.id === selectedRubroId);
  const selectedItems = datosUtiles.filter(
    (d) => d.rubro_id === selectedRubroId
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Agregar dato útil
        </Button>
      </div>

      {isCreateModalOpen && (
        <div className="rounded-lg border border-dashed p-6 space-y-4 bg-secondary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Nuevo dato útil</h3>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DatoUtilForm
            rubros={rubros}
            onSubmit={handleCreate}
            isLoading={isSaving}
          />
        </div>
      )}

      {/* Navegación de rubros */}
      <div className="flex gap-2 flex-wrap">
        {rubros.map((rubro) => {
          const count = itemCounts.get(rubro.id) || 0;
          const isSelected = rubro.id === selectedRubroId;
          return (
            <Button
              key={rubro.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRubroId(rubro.id)}
            >
              {rubro.nombre}
              {count > 0 && (
                <span className="ml-2 text-xs">({count})</span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Contenido del rubro seleccionado */}
      {selectedRubro && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{selectedRubro.nombre}</h3>
            {selectedRubro.descripcion && (
              <p className="text-sm text-muted-foreground">
                {selectedRubro.descripcion}
              </p>
            )}
          </div>

          {selectedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Sin datos aún en {selectedRubro.nombre}
            </div>
          ) : (
            <RubroItems
              items={selectedItems}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}
    </div>
  );
}
