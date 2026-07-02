"use client";

import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DestinoListRow } from "@/features/admin/lib/destino-management";
import type { CiudadListRow } from "@/features/admin/lib/ciudad-management";
import type { ZonaListRow } from "@/features/admin/lib/zona-management";
import type { Rubro, DatoUtil } from "@/lib/types";
import { DatosUtilesSuperAdminPanel } from "./DatosUtilesSuperAdminPanel";

type ScopeType = "destino" | "zona" | "ciudad";

interface DatosUtilesSuperAdminViewProps {
  destinos: DestinoListRow[];
  ciudades: CiudadListRow[];
  zonas: ZonaListRow[];
  selectedScopeType: ScopeType;
  selectedScopeId: string | null;
  selectedRubros: Rubro[];
  selectedDatosUtiles: DatoUtil[];
  selectedItemCounts: Map<string, number>;
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
}: DatosUtilesSuperAdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scopeType, setScopeType] = useState<ScopeType>(selectedScopeType);

  const handleScopeTypeChange = (newType: ScopeType) => {
    setScopeType(newType);
    startTransition(() => {
      router.push(`/admin/datos-utiles?scope_type=${newType}`);
    });
  };

  const handleScopeIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scopeId = e.target.value;
    startTransition(() => {
      if (scopeId) {
        router.push(
          `/admin/datos-utiles?scope_type=${scopeType}&scope_id=${scopeId}`
        );
      } else {
        router.push(`/admin/datos-utiles?scope_type=${scopeType}`);
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

  const getFilteredItems = (type: ScopeType) => {
    if (type === "destino") return destinos;
    if (type === "ciudad") return ciudades;
    if (type === "zona") return zonas;
    return [];
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Selector de scope */}
      <div className="rounded-lg border border-input bg-card p-6 space-y-4">
        <h3 className="font-semibold">¿A qué scope applies?</h3>
        <div className="flex gap-4">
          {(["destino", "zona", "ciudad"] as ScopeType[]).map((type) => (
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

        {/* Selector específico según scope */}
        {selectedScopeId || !scopeType ? (
          <div>
            <label htmlFor="scope-select" className="block text-sm font-medium">
              Selecciona {scopeType}
            </label>
            <select
              id="scope-select"
              value={selectedScopeId || ""}
              onChange={handleScopeIdChange}
              disabled={isPending}
              className="mt-2 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Elige {scopeType} —</option>
              {getFilteredItems(scopeType).map((item: DestinoListRow | CiudadListRow | ZonaListRow) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Panel de edición si hay scope seleccionado */}
      {selectedScopeId && (
        <>
          <div className="rounded-lg border border-input bg-card p-4">
            <p className="text-sm">
              <strong>Scope:</strong> {scopeType} - {getScopeLabel(scopeType, selectedScopeId)}
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
