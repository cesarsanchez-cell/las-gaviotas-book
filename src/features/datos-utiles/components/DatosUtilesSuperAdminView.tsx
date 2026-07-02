"use client";

import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DestinoListRow } from "@/features/admin/lib/destino-management";
import type { CiudadListRow } from "@/features/admin/lib/ciudad-management";
import type { ZonaListRow } from "@/features/admin/lib/zona-management";
import type { Rubro, DatoUtil } from "@/lib/types";
import { DatosUtilesSuperAdminPanel } from "./DatosUtilesSuperAdminPanel";

type ScopeType = "ciudad" | "zona" | "destino";

interface DatosUtilesSuperAdminViewProps {
  destinos: DestinoListRow[];
  ciudades: CiudadListRow[];
  zonas: ZonaListRow[];
  selectedScopeType: ScopeType;
  selectedScopeId: string | null;
  selectedRubros: Rubro[];
  selectedDatosUtiles: DatoUtil[];
  selectedItemCounts: Map<string, number>;
  destinosZona?: Map<string, string[]>;
}

export function DatosUtilesSuperAdminView({
  destinos,
  ciudades,
  zonas,
  selectedScopeType,
  selectedScopeId,
  selectedRubros,
  selectedDatosUtiles,
  selectedItemCounts,
  destinosZona = new Map(),
}: DatosUtilesSuperAdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cascada progresiva: ciudad → zona → destino
  // Pre-llenar si vienen de URL params
  const [selectedCiudadId, setSelectedCiudadId] = useState<string | null>(() => {
    if (selectedScopeType === "ciudad" && selectedScopeId) return selectedScopeId;
    if (selectedScopeType === "zona" && selectedScopeId) {
      const zona = zonas.find((z) => z.id === selectedScopeId);
      return zona?.ciudad_id || null;
    }
    if (selectedScopeType === "destino" && selectedScopeId) {
      const destino = destinos.find((d) => d.id === selectedScopeId);
      return destino?.ciudad_id || null;
    }
    return null;
  });

  const [advanceToZonas, setAdvanceToZonas] = useState(() => {
    return selectedScopeType === "zona" || selectedScopeType === "destino";
  });

  const [selectedZonaId, setSelectedZonaId] = useState<string | null>(() => {
    if (selectedScopeType === "zona" && selectedScopeId) return selectedScopeId;
    if (selectedScopeType === "destino" && selectedScopeId) {
      // Buscar la zona que contiene este destino
      const destino = destinos.find((d) => d.id === selectedScopeId);
      if (destino) {
        for (const [zonaId, destIds] of destinosZona.entries()) {
          if (destIds.includes(destino.id)) {
            return zonaId;
          }
        }
      }
    }
    return null;
  });

  const [advanceToDestinos, setAdvanceToDestinos] = useState(
    selectedScopeType === "destino"
  );

  const [selectedDestinoId, setSelectedDestinoId] = useState<string | null>(() => {
    if (selectedScopeType === "destino" && selectedScopeId) return selectedScopeId;
    return null;
  });

  // Determinar el scope_type y scope_id actual basado en la cascada
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

  const handleCiudadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cidId = e.target.value;
    setSelectedCiudadId(cidId);
    setAdvanceToZonas(false);
    setSelectedZonaId(null);
    setAdvanceToDestinos(false);
    setSelectedDestinoId(null);
  };

  const handleZonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const zonaId = e.target.value;
    setSelectedZonaId(zonaId);
    setAdvanceToDestinos(false);
    setSelectedDestinoId(null);
  };

  const handleDestinoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const destId = e.target.value;
    setSelectedDestinoId(destId);
  };

  const handleCreateDatos = () => {
    const scopeType = getCurrentScopeType();
    const scopeId = getCurrentScopeId();

    if (scopeId) {
      startTransition(() => {
        router.push(
          `/admin/datos-utiles?scope_type=${scopeType}&scope_id=${scopeId}`
        );
      });
    }
  };

  // Filtrar zonas por ciudad
  const getZonasByCiudad = (): ZonaListRow[] => {
    if (!selectedCiudadId) return [];
    return zonas.filter((z) => z.ciudad_id === selectedCiudadId);
  };

  // Filtrar destinos por zona
  const getDestinosByZona = (): DestinoListRow[] => {
    if (!selectedZonaId) return [];
    const destIds = destinosZona.get(selectedZonaId) || [];
    return destinos.filter((d) => destIds.includes(d.id));
  };

  const getScopeLabel = (type: ScopeType, id: string | null): string => {
    if (!id) return "";
    if (type === "ciudad") return ciudades.find((c) => c.id === id)?.nombre || "";
    if (type === "zona") return zonas.find((z) => z.id === id)?.nombre || "";
    if (type === "destino") return destinos.find((d) => d.id === id)?.nombre || "";
    return "";
  };

  const currentScopeType = getCurrentScopeType();
  const currentScopeId = getCurrentScopeId();

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

        {selectedCiudadId && !advanceToZonas && (
          <button
            onClick={handleCreateDatos}
            disabled={isPending}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Crear dato útil para {getScopeLabel("ciudad", selectedCiudadId)}
          </button>
        )}

        {selectedCiudadId && (
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={advanceToZonas}
              onChange={(e) => setAdvanceToZonas(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              Avanzar a zonas de {getScopeLabel("ciudad", selectedCiudadId)}
            </span>
          </label>
        )}
      </div>

      {/* Nivel 2: Zona */}
      {advanceToZonas && selectedCiudadId && (
        <div className="rounded-lg border border-input bg-card p-6 space-y-4">
          <h3 className="font-semibold">Nivel 2: Zona</h3>

          <div>
            <label htmlFor="zona-select" className="block text-sm font-medium">
              Selecciona zona de {getScopeLabel("ciudad", selectedCiudadId)}
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

          {selectedZonaId && !advanceToDestinos && (
            <button
              onClick={handleCreateDatos}
              disabled={isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Crear dato útil para {getScopeLabel("zona", selectedZonaId)}
            </button>
          )}

          {selectedZonaId && (
            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={advanceToDestinos}
                onChange={(e) => setAdvanceToDestinos(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">
                Avanzar a destinos de {getScopeLabel("zona", selectedZonaId)}
              </span>
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
              Selecciona destino de {getScopeLabel("zona", selectedZonaId)}
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

          {selectedDestinoId && (
            <button
              onClick={handleCreateDatos}
              disabled={isPending}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Crear dato útil para {getScopeLabel("destino", selectedDestinoId)}
            </button>
          )}
        </div>
      )}

      {/* Panel de edición si ya hay scope seleccionado en URL */}
      {selectedScopeId && (
        <>
          <div className="rounded-lg border border-input bg-card p-4">
            <p className="text-sm">
              <strong>Editando:</strong> {selectedScopeType} -{" "}
              {getScopeLabel(selectedScopeType as ScopeType, selectedScopeId)}
            </p>
          </div>

          <DatosUtilesSuperAdminPanel
            scopeType={selectedScopeType as ScopeType}
            scopeId={selectedScopeId}
            rubros={selectedRubros}
            datosUtiles={selectedDatosUtiles}
            itemCounts={selectedItemCounts}
          />
        </>
      )}
    </div>
  );
}
