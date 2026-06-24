"use client";

import { useState, FormEvent } from "react";
import { completeInvitacionAction } from "@/features/panel/lib/completeInvitacion-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface OnboardingFormProps {
  hospedajeId: string;
  hospedajeNombre: string;
  prefilledEmail: string;
  prefilledWhatsapp: string;
}

const TIPOS = [
  { value: "hotel", label: "Hotel" },
  { value: "apart", label: "Apart" },
  { value: "cabana", label: "Cabaña" },
  { value: "hosteria", label: "Hostería" },
  { value: "camping", label: "Camping" },
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
];

export function OnboardingForm({
  hospedajeId,
  hospedajeNombre,
  prefilledEmail,
  prefilledWhatsapp,
}: OnboardingFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("hospedaje_id", hospedajeId);

    const result = await completeInvitacionAction(formData);

    if (result.error) {
      setError(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {error && (
        <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Sección 1: Datos de cuenta */}
      <fieldset className="space-y-4 border-b border-gray-200 pb-6">
        <legend className="font-semibold text-lg">Tu cuenta</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="responsable_nombre">Nombre completo *</Label>
            <Input
              id="responsable_nombre"
              name="responsable_nombre"
              type="text"
              required
              placeholder="Ej: Juan García"
              className={fieldErrors.responsable_nombre ? "border-red-500" : ""}
            />
            {fieldErrors.responsable_nombre && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.responsable_nombre}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="responsable_email">Email *</Label>
            <Input
              id="responsable_email"
              name="responsable_email"
              type="email"
              required
              value={prefilledEmail}
              readOnly
              className="bg-gray-100"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              El email de invitación (no se puede cambiar)
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Mínimo 8 caracteres"
              className={fieldErrors.password ? "border-red-500" : ""}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>
        </div>
      </fieldset>

      {/* Sección 2: Datos del hospedaje */}
      <fieldset className="space-y-4 border-b border-gray-200 pb-6">
        <legend className="font-semibold text-lg">Hospedaje: {hospedajeNombre}</legend>

        <div>
          <Label htmlFor="slug">URL única (slug) *</Label>
          <Input
            id="slug"
            name="slug"
            type="text"
            required
            placeholder="Ej: mi-cabaña-2024"
            className={fieldErrors.slug ? "border-red-500" : ""}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Solo minúsculas, números y guiones. Ej: mi-hospedaje-2024
          </p>
          {fieldErrors.slug && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.slug}</p>
          )}
        </div>

        <div>
          <Label htmlFor="nombre">Nombre del hospedaje *</Label>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            required
            placeholder="Ej: Cabaña Frente al Mar"
            className={fieldErrors.nombre ? "border-red-500" : ""}
          />
          {fieldErrors.nombre && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.nombre}</p>
          )}
        </div>

        <div>
          <Label htmlFor="tipo">Tipo *</Label>
          <Select
            name="tipo"
            required
            defaultValue=""
            className={fieldErrors.tipo ? "border-red-500" : ""}
          >
            <option value="" disabled>
              Selecciona un tipo
            </option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          {fieldErrors.tipo && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.tipo}</p>
          )}
        </div>

        <div>
          <Label htmlFor="descripcion_corta">Descripción corta *</Label>
          <Textarea
            id="descripcion_corta"
            name="descripcion_corta"
            required
            placeholder="Ej: Cabaña acogedora con vista al mar, ideal para parejas"
            className={
              fieldErrors.descripcion_corta
                ? "border-red-500 min-h-20"
                : "min-h-20"
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            20-200 caracteres
          </p>
          {fieldErrors.descripcion_corta && (
            <p className="mt-1 text-xs text-red-600">
              {fieldErrors.descripcion_corta}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="descripcion_larga">Descripción completa (opcional)</Label>
          <Textarea
            id="descripcion_larga"
            name="descripcion_larga"
            placeholder="Detalles adicionales sobre el hospedaje, comodidades, ubicación..."
            className="min-h-24"
          />
        </div>

        <div>
          <Label htmlFor="direccion">Dirección *</Label>
          <Input
            id="direccion"
            name="direccion"
            type="text"
            required
            placeholder="Ej: Calle Principal 123"
            className={fieldErrors.direccion ? "border-red-500" : ""}
          />
          {fieldErrors.direccion && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.direccion}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lat">Latitud (opcional)</Label>
            <Input
              id="lat"
              name="lat"
              type="number"
              step="0.000001"
              placeholder="Ej: -37.2587"
              className={fieldErrors.lat ? "border-red-500" : ""}
            />
            {fieldErrors.lat && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.lat}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lng">Longitud (opcional)</Label>
            <Input
              id="lng"
              name="lng"
              type="number"
              step="0.000001"
              placeholder="Ej: -56.7351"
              className={fieldErrors.lng ? "border-red-500" : ""}
            />
            {fieldErrors.lng && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.lng}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="responsable_whatsapp">WhatsApp *</Label>
          <Input
            id="responsable_whatsapp"
            name="responsable_whatsapp"
            type="tel"
            required
            value={prefilledWhatsapp}
            readOnly
            className="bg-gray-100"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            El WhatsApp de invitación (no se puede cambiar aquí)
          </p>
        </div>
      </fieldset>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Completando..." : "Completar registro"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Al completar el registro, confirmas que eres el responsable del hospedaje
        y que todos los datos son correctos.
      </p>
    </form>
  );
}
