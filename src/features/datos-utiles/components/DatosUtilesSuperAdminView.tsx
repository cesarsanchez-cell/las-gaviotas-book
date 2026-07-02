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
  destinosZona?: Map<string, string[]>;   // zona_id → destino_id[]
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
  const [scopeType, setScopeType] = useState<ScopeType>(selectedScopeType);
  const [selectedPrimaryScopeId, setSelectedPrimaryScopeId] = useState<string | null>(null);

  const handleScopeTypeChange = (newType: ScopeType) => {
    setScopeType(newType);
    setSelectedPrimaryScopeId(null);
    startTransition(() => {
      router.push(`/admin/datos-utiles?scope_type=${newType}`);
    });
  };

  const handlePrimaryScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const primaryId = e.target.value;
    setSelectedPrimaryScopeId(primaryId);
  };

  const handleDestinChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const destinId = e.target.value;
    startTransition(() => {
      if (destinId) {
        router.push(
          `/admin/datos-utiles?scope_type=${scopeType}&scope_id=${destinId}`
        );
      }
    });
  };

  const getScopeLabel = (type: ScopeType, id: string | null): string => {
    if (!id) return "";
    if (type === "destino") {
      return destinos.find((d) => d.id === id)?.nombre || "";
    }
    if (type === "ciudad") {
      return ciudades.find((c) => c.id === id)?.nombre || "";
    }
    if (type === "zona") {
      return zonas.find((z) => z.id === id)?.nombre || "";
    }
    return "";
  };

  const getPrimaryItems = (type: ScopeType) => {
    if (type === "destino") return destinos;
    if (type === "ciudad") return ciudades;
    if (type === "zona") return zonas;
    return [];
  };

  // Filtrar destinos según la selección primaria
  const getFilteredDestinos = (): DestinoListRow[] => {
    if (!selectedPrimaryScopeId) return [];

    if (scopeType === "ciudad") {
      // Destinos de esa ciudad (filtra por ciudad_id)
      const cidId = selectedPrimaryScopeId;
      return destinos.filter((d) => d.ciudad_id === cidId);
    }

    if (scopeType === "zona") {
      // Destinos de esa zona (usa map de zona → destinos)
      const zoneDestIds = destinosZona.get(selectedPrimaryScopeId) || [];
      return destinos.filter((d) => zoneDestIds.includes(d.id));
    }

    if (scopeType === "destino") {
      // Todos los destinos
      return destinos;
    }

    return [];
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Selector de scope */}
      <div className="rounded-lg border border-input bg-card p-6 space-y-6">
        <h3 className="font-semibold">¿A qué scope aplica?</h3>

        {/* Radio buttons: Ciudad, Zona, Destino (en ese orden) */}
        <div className="flex gap-4">
          {(["ciudad", "zona", "destino"] as ScopeType[]).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="scope_type"
                value={type}
                checked={scopeType === type}
                onChange={() => handleScopeTypeChange(type)}
                disabled={isPending}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium capitalize">{type}</span>
            </label>
          ))}
        </div>

        {/* Dropdown 1: Selecciona ciudad/zona/destino primario */}
        <div>
          <label htmlFor="primary-select" className="block text-sm font-medium">
            Selecciona {scopeType}
          </label>
          <select
            id="primary-select"
            value={selectedPrimaryScopeId || ""}
            onChange={handlePrimaryScopeChange}
            disabled={isPending}
            className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Elige {scopeType} —</option>
            {getPrimaryItems(scopeType).map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Selecciona destino (solo si city/zona) */}
        {selectedPrimaryScopeId && scopeType !== "destino" && (
          <div>
            <label htmlFor="destino-select" className="block text-sm font-medium">
              Selecciona destino en {getScopeLabel(scopeType, selectedPrimaryScopeId)}
            </label>
            <select
              id="destino-select"
              value={selectedScopeId || ""}
              onChange={handleDestinChange}
              disabled={isPending}
              className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige destino —</option>
              {getFilteredDestinos().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dropdown directo para destino (si scopeType === "destino") */}
        {scopeType === "destino" && (
          <div>
            <label htmlFor="destino-direct" className="block text-sm font-medium">
              Selecciona destino
            </label>
            <select
              id="destino-direct"
              value={selectedScopeId || ""}
              onChange={handleDestinChange}
              disabled={isPending}
              className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige destino —</option>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Panel de edición si hay scope seleccionado */}
      {selectedScopeId && (
        <>
          <div className="rounded-lg border border-input bg-card p-4">
            <p className="text-sm">
              <strong>Scope:</strong>{" "}
              {scopeType === "destino"
                ? `destino - ${getScopeLabel("destino", selectedScopeId)}`
                : `${scopeType} - ${getScopeLabel(scopeType, selectedPrimaryScopeId)} → destino ${getScopeLabel("destino", selectedScopeId)}`}
            </p>
          </div>

          <DatosUtilesSuperAdminPanel
            scopeType={scopeType}
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
