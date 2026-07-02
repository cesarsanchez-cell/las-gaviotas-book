"use client";

import { useState } from "react";
import { useTransition } from "react";
import type { DestinoListRow } from "@/features/admin/lib/destino-management";
import type { CiudadListRow } from "@/features/admin/lib/ciudad-management";
import type { ZonaListRow } from "@/features/admin/lib/zona-management";
import type { Rubro, DatoUtil } from "@/lib/types";
import { DatoUtilEditModal } from "./DatoUtilEditModal";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  crearDatoUtilAction,
  actualizarDatoUtilAction,
  eliminarDatoUtilAction,
} from "../lib/datos-utiles-actions";

type ScopeType = "ciudad" | "zona" | "destino";

interface DatosUtilesSuperAdminViewProps {
  destinos: DestinoListRow[];
  ciudades: CiudadListRow[];
  zonas: ZonaListRow[];
  rubros: Rubro[];
  datosMap: Map<string, DatoUtil[]>;
  destinosZona?: Map<string, string[]>;
  isSuperAdmin: boolean;
}

export function DatosUtilesSuperAdminView({
  destinos,
  ciudades,
  zonas,
  rubros,
  datosMap,
  destinosZona = new Map(),
  isSuperAdmin,
}: DatosUtilesSuperAdminViewProps) {
  const [isPending, startTransition] = useTransition();

  // Cascada progresiva: ciudad → zona → destino
  const [selectedCiudadId, setSelectedCiudadId] = useState<string | null>(null);
  const [advanceToZonas, setAdvanceToZonas] = useState(false);
  const [selectedZonaId, setSelectedZonaId] = useState<string | null>(null);
  const [advanceToDestinos, setAdvanceToDestinos] = useState(false);
  const [selectedDestinoId, setSelectedDestinoId] = useState<string | null>(null);

  // Edición
  const [editingDato, setEditingDato] = useState<DatoUtil | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [datos, setDatos] = useState<DatoUtil[]>([]);

  // Mapa local que se actualiza cuando editas/creas/eliminas datos
  const [localDatosMap, setLocalDatosMap] = useState(() => {
    const map = new Map(datosMap);
    return map;
  });

  // Determinar scope actual
  const getCurrentScopeType = (): ScopeType => {
    if (advanceToDestinos && selectedDestinoId) return "destino";
    if (advanceToZonas && selectedZonaId) return "zona";
    if (selectedCiudadId) return "ciudad";
    return "ciudad";
  };

  const getCurrentScopeId = (): string | null => {
    if (advanceToDestinos && selectedDestinoId) return selectedDestinoId;
    if (advanceToZonas && selectedZonaId) return selectedZonaId;
    return selectedCiudadId;
  };

  const getScopeName = (): string => {
    const scopeType = getCurrentScopeType();
    const scopeId = getCurrentScopeId();
    if (!scopeId) return "";
    if (scopeType === "ciudad") return ciudades.find((c) => c.id === scopeId)?.nombre || "";
    if (scopeType === "zona") return zonas.find((z) => z.id === scopeId)?.nombre || "";
    if (scopeType === "destino") return destinos.find((d) => d.id === scopeId)?.nombre || "";
    return "";
  };

  const handleCiudadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cidId = e.target.value;
    setSelectedCiudadId(cidId);
    setAdvanceToZonas(false);
    setSelectedZonaId(null);
    setAdvanceToDestinos(false);
    setSelectedDestinoId(null);
    updateDatos(cidId, "ciudad");
  };

  const handleZonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zonaId = e.target.value;
    setSelectedZonaId(zonaId);
    setAdvanceToDestinos(false);
    setSelectedDestinoId(null);
    updateDatos(zonaId, "zona");
  };

  const handleDestinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const destId = e.target.value;
    setSelectedDestinoId(destId);
    updateDatos(destId, "destino");
  };

  const updateDatos = (scopeId: string, scopeType: ScopeType) => {
    const key = `${scopeType}:${scopeId}`;
    const loaded = localDatosMap.get(key) || [];
    setDatos([...loaded]);
  };

  const handleCreateNew = async () => {
    const scopeType = getCurrentScopeType();
    const scopeId = getCurrentScopeId();
    if (!scopeId) return;

    setEditingDato(null);
    setIsEditModalOpen(true);
  };

  const handleEdit = (dato: DatoUtil) => {
    setEditingDato(dato);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (datoId: string) => {
    if (!confirm("¿Eliminar este dato?")) return;
    try {
      await eliminarDatoUtilAction(datoId);

      const scopeType = getCurrentScopeType();
      const scopeId = getCurrentScopeId();

      setDatos((prev) => prev.filter((d) => d.id !== datoId));

      // Actualizar localDatosMap
      if (scopeId) {
        setLocalDatosMap((prevMap) => {
          const newMap = new Map(prevMap);
          const key = `${scopeType}:${scopeId}`;
          const scopeDatos = newMap.get(key) || [];
          newMap.set(key, scopeDatos.filter((d) => d.id !== datoId));
          return newMap;
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleSaveDato = async (formData: {
    rubroId: string;
    nombre: string;
    direccion?: string;
    contacto?: string;
    scopeType?: ScopeType;
    scopeId?: string;
  }) => {
    const scopeType = formData.scopeType || getCurrentScopeType();
    const scopeId = formData.scopeId || getCurrentScopeId();

    if (!scopeId) return;

    try {
      if (editingDato) {
        const updated = await actualizarDatoUtilAction(editingDato.id, {
          rubroId: formData.rubroId,
          nombre: formData.nombre,
          direccion: formData.direccion,
          contacto: formData.contacto,
          scopeType,
          scopeId,
        });

        // Actualizar estado local
        setDatos((prev) =>
          prev.map((d) => (d.id === editingDato.id ? updated : d))
        );

        // Actualizar localDatosMap para persistencia si navegas a otra zona y vuelves
        setLocalDatosMap((prevMap) => {
          const newMap = new Map(prevMap);
          const key = `${scopeType}:${scopeId}`;
          const scopeDatos = newMap.get(key) || [];
          newMap.set(key, scopeDatos.map((d) => (d.id === editingDato.id ? updated : d)));
          return newMap;
        });
      } else {
        const newDato = await crearDatoUtilAction({
          rubroId: formData.rubroId,
          nombre: formData.nombre,
          direccion: formData.direccion,
          contacto: formData.contacto,
          scopeType,
          scopeId,
        });

        setDatos((prev) => [...prev, newDato]);

        // Agregar a localDatosMap
        setLocalDatosMap((prevMap) => {
          const newMap = new Map(prevMap);
          const key = `${scopeType}:${scopeId}`;
          const scopeDatos = newMap.get(key) || [];
          newMap.set(key, [...scopeDatos, newDato]);
          return newMap;
        });
      }
      setIsEditModalOpen(false);
      setEditingDato(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  const getZonasByCiudad = (): ZonaListRow[] => {
    if (!selectedCiudadId) return [];
    return zonas.filter((z) => z.ciudad_id === selectedCiudadId);
  };

  const getDestinosByZona = (): DestinoListRow[] => {
    if (!selectedZonaId) return [];
    const destIds = destinosZona.get(selectedZonaId) || [];
    return destinos.filter((d) => destIds.includes(d.id));
  };

  const scopeName = getScopeName();
  const scopeType = getCurrentScopeType();
  const scopeId = getCurrentScopeId();

  return (
    <div className="max-w-4xl space-y-6">
      {/* Nivel 1: Ciudad */}
      <div className="rounded-lg border border-input bg-card p-6 space-y-4">
        <h3 className="font-semibold">Nivel 1: Ciudad</h3>

        <div>
          <label htmlFor="ciudad-select" className="block text-sm font-medium">
            Selecciona ciudad
          </label>
          <select
            id="ciudad-select"
            value={selectedCiudadId || ""}
            onChange={handleCiudadChange}
            disabled={isPending}
            className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Elige ciudad —</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {selectedCiudadId && (
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={advanceToZonas}
              onChange={(e) => {
                setAdvanceToZonas(e.target.checked);
                setSelectedZonaId(null);
                setAdvanceToDestinos(false);
                setSelectedDestinoId(null);
              }}
              disabled={isPending}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Avanzar a zonas</span>
          </label>
        )}
      </div>

      {/* Nivel 2: Zona */}
      {advanceToZonas && selectedCiudadId && (
        <div className="rounded-lg border border-input bg-card p-6 space-y-4">
          <h3 className="font-semibold">Nivel 2: Zona</h3>

          <div>
            <label htmlFor="zona-select" className="block text-sm font-medium">
              Selecciona zona
            </label>
            <select
              id="zona-select"
              value={selectedZonaId || ""}
              onChange={handleZonaChange}
              disabled={isPending}
              className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige zona —</option>
              {getZonasByCiudad().map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>

          {selectedZonaId && (
            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={advanceToDestinos}
                onChange={(e) => {
                  setAdvanceToDestinos(e.target.checked);
                  setSelectedDestinoId(null);
                }}
                disabled={isPending}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Avanzar a destinos</span>
            </label>
          )}
        </div>
      )}

      {/* Nivel 3: Destino */}
      {advanceToDestinos && selectedZonaId && (
        <div className="rounded-lg border border-input bg-card p-6 space-y-4">
          <h3 className="font-semibold">Nivel 3: Destino</h3>

          <div>
            <label htmlFor="destino-select" className="block text-sm font-medium">
              Selecciona destino
            </label>
            <select
              id="destino-select"
              value={selectedDestinoId || ""}
              onChange={handleDestinoChange}
              disabled={isPending}
              className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige destino —</option>
              {getDestinosByZona().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Panel de datos para el scope seleccionado */}
      {scopeId && scopeName && (
        <div className="rounded-lg border border-input bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                Datos para: {scopeName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {scopeType === "ciudad" && "Cobertura: Ciudad"}
                {scopeType === "zona" && "Cobertura: Zona"}
                {scopeType === "destino" && "Cobertura: Destino"}
              </p>
            </div>
            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </div>

          {datos.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Sin datos aún
            </div>
          ) : (
            <div className="space-y-3">
              {datos.map((dato) => {
                const rubro = rubros.find((r) => r.id === dato.rubro_id);
                return (
                  <div
                    key={dato.id}
                    className="rounded-md border p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{dato.nombre}</p>
                      {rubro && (
                        <p className="text-xs text-muted-foreground">
                          {rubro.nombre}
                        </p>
                      )}
                      {dato.direccion && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {dato.direccion}
                        </p>
                      )}
                      {dato.contacto && (
                        <p className="text-xs text-muted-foreground">
                          📱 {dato.contacto}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(dato)}
                        className="p-2 hover:bg-secondary rounded"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dato.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de edición */}
      {isEditModalOpen && (
        <DatoUtilEditModal
          rubros={rubros}
          ciudades={ciudades}
          zonas={zonas}
          destinos={destinos}
          editingDato={editingDato}
          defaultScopeType={scopeType}
          defaultScopeId={scopeId}
          isSuperAdmin={isSuperAdmin}
          onSave={handleSaveDato}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDato(null);
          }}
        />
      )}
    </div>
  );
}
