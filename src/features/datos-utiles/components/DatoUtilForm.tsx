"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Rubro } from "@/lib/types";

interface DatoUtilFormProps {
  rubros: Rubro[];
  initialData?: {
    rubroId?: string;
    nombre?: string;
    direccion?: string;
    contacto?: string;
  };
  onSubmit: (data: {
    rubroId: string;
    nombre: string;
    direccion?: string;
    contacto?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function DatoUtilForm({
  rubros,
  initialData,
  onSubmit,
  isLoading = false,
}: DatoUtilFormProps) {
  const [rubroId, setRubroId] = useState(initialData?.rubroId || "");
  const [nombre, setNombre] = useState(initialData?.nombre || "");
  const [direccion, setDireccion] = useState(initialData?.direccion || "");
  const [contacto, setContacto] = useState(initialData?.contacto || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onSubmit({
        rubroId,
        nombre,
        direccion: direccion || undefined,
        contacto: contacto || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rubro">Rubro *</Label>
        <Select
          id="rubro"
          value={rubroId}
          onChange={(e) => setRubroId(e.currentTarget.value)}
          disabled={isLoading || !!initialData?.rubroId}
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

      {error && <div className="text-sm text-red-600">{error}</div>}

      <Button type="submit" disabled={isLoading || !rubroId || !nombre}>
        {isLoading ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
