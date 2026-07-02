"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Rubro, DatoUtil } from "@/lib/types";
import type { DestinoListRow } from "@/features/admin/lib/destino-management";
import type { CiudadListRow } from "@/features/admin/lib/ciudad-management";
import type { ZonaListRow } from "@/features/admin/lib/zona-management";

type ScopeType = "ciudad" | "zona" | "destino";

interface DatoUtilEditModalProps {
  rubros: Rubro[];
  ciudades: CiudadListRow[];
  zonas: ZonaListRow[];
  destinos: DestinoListRow[];
  editingDato: DatoUtil | null;
  defaultScopeType: ScopeType;
  defaultScopeId: string | null;
  isSuperAdmin: boolean;
  onSave: (data: {
    rubroId: string;
    nombre: string;
    direccion?: string;
    contacto?: string;
    scopeType?: ScopeType;
    scopeId?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function DatoUtilEditModal({
  rubros,
  ciudades,
  zonas,
  destinos,
  editingDato,
  defaultScopeType,
  defaultScopeId,
  isSuperAdmin,
  onSave,
  onClose,
}: DatoUtilEditModalProps) {
  const [rubroId, setRubroId] = useState(editingDato?.rubro_id || "");
  const [nombre, setNombre] = useState(editingDato?.nombre || "");
  const [direccion, setDireccion] = useState(editingDato?.direccion || "");
  const [contacto, setContacto] = useState(editingDato?.contacto || "");
  const [scopeType, setScopeType] = useState<ScopeType>(editingDato?.scope_type as ScopeType || defaultScopeType);
  const [scopeId, setScopeId] = useState(editingDato?.scope_id || defaultScopeId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!rubroId || !nombre || !scopeId) {
      setError("Rubro, nombre y cobertura son requeridos");
      return;
    }

    setIsLoading(true);
    try {
      await onSave({
        rubroId,
        nombre,
        direccion: direccion || undefined,
        contacto: contacto || undefined,
        scopeType,
        scopeId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="rounded-lg border bg-card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            {editingDato ? "Editar dato" : "Nuevo dato"}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rubro">Rubro * {!isSuperAdmin && <span className="text-xs text-muted-foreground">(solo Super Admin)</span>}</Label>
            <Select
              id="rubro"
              value={rubroId}
              onChange={(e) => setRubroId(e.currentTarget.value)}
              disabled={isLoading || !isSuperAdmin}
              required
            >
              <option value="">Selecciona un rubro</option>
              {rubros.map((rubro) => (
                <option key={rubro.id} value={rubro.id}>
                  {rubro.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Hospital San Carlos"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              placeholder="Ej: Avenida Principal 123"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="contacto">Contacto</Label>
            <Input
              id="contacto"
              placeholder="Ej: +54 9 2267 123456 o email@ejemplo.com"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Cobertura geográfica - solo editable si es super admin */}
          <div className="border-t pt-4">
            <Label htmlFor="scope">Cobertura geográfica * {!isSuperAdmin && <span className="text-xs text-muted-foreground">(solo Super Admin)</span>}</Label>
            <Select
              id="scope"
              value={`${scopeType}:${scopeId}`}
              onChange={(e) => {
                const [type, id] = e.currentTarget.value.split(":");
                setScopeType(type as ScopeType);
                setScopeId(id);
              }}
              disabled={isLoading || !isSuperAdmin}
              required
            >
              <option value="">Selecciona cobertura</option>

              <optgroup label="Ciudades">
                {ciudades.map((c) => (
                  <option key={c.id} value={`ciudad:${c.id}`}>
                    📍 {c.nombre} (Ciudad)
                  </option>
                ))}
              </optgroup>

              <optgroup label="Zonas">
                {zonas.map((z) => (
                  <option key={z.id} value={`zona:${z.id}`}>
                    📌 {z.nombre} (Zona)
                  </option>
                ))}
              </optgroup>

              <optgroup label="Destinos">
                {destinos.map((d) => (
                  <option key={d.id} value={`destino:${d.id}`}>
                    🏘️ {d.nombre} (Destino)
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !rubroId || !nombre || !scopeId}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
