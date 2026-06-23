"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createHospedajeAction } from "@/features/admin/lib/hospedaje-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

interface FormState {
  isLoading: boolean;
  error?: string;
  fieldErrors: Record<string, string>;
}

interface Destino {
  id: string;
  nombre: string;
  slug: string;
}

export function InvitacionFormulario({
  destinoId: initialDestinoId,
  destinos,
  isSuperAdmin,
}: {
  destinoId: string;
  destinos: Destino[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    isLoading: false,
    fieldErrors: {},
  });
  const [destinoId, setDestinoId] = useState(initialDestinoId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ isLoading: true, fieldErrors: {} });

    const formData = new FormData(e.currentTarget);
    const result: ActionResult = await createHospedajeAction(formData);

    if (result.ok) {
      router.push("/admin/hospedajes");
      return;
    }

    const newFieldErrors: Record<string, string> = {};
    if (result.fieldErrors) {
      Object.assign(newFieldErrors, result.fieldErrors);
    }

    setState({
      isLoading: false,
      error: result.error,
      fieldErrors: newFieldErrors,
    });

    // Focus primer campo con error
    if (Object.keys(newFieldErrors).length > 0) {
      const firstErrorField = Object.keys(newFieldErrors)[0];
      (document.querySelector(`[name="${firstErrorField}"]`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="space-y-4 rounded-lg border p-6">
        {isSuperAdmin && (
          <div>
            <Label htmlFor="destino_id">Destino</Label>
            <Select
              id="destino_id"
              value={destinoId}
              onChange={(e) => setDestinoId(e.currentTarget.value)}
              disabled={state.isLoading}
              className={state.fieldErrors.destino_id ? "border-red-500" : ""}
            >
              <option value="">Seleccioná un destino</option>
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
            {state.fieldErrors.destino_id && (
              <p className="mt-1 text-sm text-red-600">
                {state.fieldErrors.destino_id}
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="nombre">Nombre del hospedaje</Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Cabaña Las Gaviotas"
            required
            autoFocus={!isSuperAdmin}
            disabled={state.isLoading}
            aria-invalid={!!state.fieldErrors.nombre}
            className={state.fieldErrors.nombre ? "border-red-500" : ""}
          />
          {state.fieldErrors.nombre && (
            <p className="mt-1 text-sm text-red-600">
              {state.fieldErrors.nombre}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="responsable_email">Email del responsable</Label>
          <Input
            id="responsable_email"
            name="responsable_email"
            type="email"
            placeholder="propietario@example.com"
            required
            disabled={state.isLoading}
            aria-invalid={!!state.fieldErrors.responsable_email}
            className={state.fieldErrors.responsable_email ? "border-red-500" : ""}
          />
          {state.fieldErrors.responsable_email && (
            <p className="mt-1 text-sm text-red-600">
              {state.fieldErrors.responsable_email}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="responsable_whatsapp">WhatsApp del responsable</Label>
          <Input
            id="responsable_whatsapp"
            name="responsable_whatsapp"
            type="tel"
            placeholder="Ej: 1155555555 o +541155555555"
            required
            disabled={state.isLoading}
            aria-invalid={!!state.fieldErrors.responsable_whatsapp}
            className={state.fieldErrors.responsable_whatsapp ? "border-red-500" : ""}
          />
          {state.fieldErrors.responsable_whatsapp && (
            <p className="mt-1 text-sm text-red-600">
              {state.fieldErrors.responsable_whatsapp}
            </p>
          )}
        </div>

        <input type="hidden" name="destino_id" value={destinoId} required />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={state.isLoading}>
          {state.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando invitación...
            </>
          ) : (
            "Enviar invitación"
          )}
        </Button>
        <Link href="/admin/hospedajes">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
