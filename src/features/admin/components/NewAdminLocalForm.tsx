"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { createAdminLocalAction } from "@/features/admin/lib/admin-management";
import type { DestinoOption } from "@/features/admin/lib/queries";

interface Props {
  destinos: DestinoOption[];
}

export function NewAdminLocalForm({ destinos }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setInvitedEmail(null);

    const input = {
      email: String(formData.get("email") ?? "").trim(),
      nombre: String(formData.get("nombre") ?? "").trim(),
      destinoId: String(formData.get("destinoId") ?? ""),
    };

    startTransition(async () => {
      const res = await createAdminLocalAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (res.ok && res.email) {
        setInvitedEmail(res.email);
      }
    });
  }

  if (invitedEmail) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden />
          <div>
            <p className="font-medium text-emerald-900">Invitación enviada</p>
            <p className="mt-1 text-sm text-emerald-800">
              Le mandamos un mail a <strong>{invitedEmail}</strong> con el link
              para activar su cuenta y definir su contraseña.
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              El link es válido por 24 horas. Si no le llega, revisá la carpeta
              de spam o reintentá.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInvitedEmail(null)}
          className="mt-4 text-sm text-emerald-800 underline"
        >
          Invitar a otro admin
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            placeholder="María Pérez"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.nombre && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.nombre}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="maria@misescapadas.com.ar"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="destinoId">
          Destino asignado
        </label>
        <select
          id="destinoId"
          name="destinoId"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Elegí un destino…
          </option>
          {destinos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
        {fieldErrors.destinoId && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.destinoId}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        {pending ? "Enviando invitación…" : "Enviar invitación"}
      </button>
    </form>
  );
}
