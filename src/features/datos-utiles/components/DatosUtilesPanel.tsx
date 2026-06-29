"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import type { Rubro, DatoUtil } from "@/lib/types";
import { DatoUtilForm } from "./DatoUtilForm";
import { RubroItems } from "./RubroItems";
import {
  crearDatoUtilAction,
  eliminarDatoUtilAction,
} from "../lib/datos-utiles-actions";
import { useActionState } from "react";

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
  const [selectedRubroId, setSelectedRubroId] = useState<string | null>(null);
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
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const rubrosTabs = rubros.map((rubro) => ({
    rubro,
    count: itemCounts.get(rubro.id) || 0,
    items: datosUtiles.filter((d) => d.rubro_id === rubro.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar dato útil
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo dato útil</DialogTitle>
              <DialogDescription>
                Agrega un servicio o información útil para los visitantes
              </DialogDescription>
            </DialogHeader>
            <DatoUtilForm
              rubros={rubros}
              onSubmit={handleCreate}
              isLoading={isSaving}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={rubros[0]?.id || ""} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          {rubrosTabs.map(({ rubro, count }) => (
            <TabsTrigger key={rubro.id} value={rubro.id}>
              <span className="truncate">{rubro.nombre}</span>
              {count > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({count})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {rubrosTabs.map(({ rubro, items }) => (
          <TabsContent key={rubro.id} value={rubro.id} className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Sin datos aún en {rubro.nombre}
              </div>
            ) : (
              <RubroItems
                rubro={rubro}
                items={items}
                onDelete={handleDelete}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
