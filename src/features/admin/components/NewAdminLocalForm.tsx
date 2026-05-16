"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { createAdminLocalAction } from "@/features/admin/lib/admin-management";
import type { DestinoOption } from "@/features/admin/lib/queries";

interface Props {
  destinos: DestinoOption[];
}

interface SuccessState {
  email: string;
  tempPassword: string;
}

export function NewAdminLocalForm({ destinos }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setSuccess(null);
    setCopied(false);

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
      if (res.ok && res.tempPassword && res.email) {
        setSuccess({ email: res.email, tempPassword: res.tempPassword });
      }
    });
  }

  async function copyPassword() {
    if (!success) return;
    await navigator.clipboard.writeText(success.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-medium text-emerald-900">Admin creado.</p>
        <p className="mt-1 text-sm text-emerald-800">
          Pasale estas credenciales a <strong>{success.email}</strong> por canal
          privado. <strong>Este password se muestra una sola vez.</strong>
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 font-mono text-sm">
          <span className="flex-1 break-all">{success.tempPassword}</span>
          <button
            type="button"
            onClick={copyPassword}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-800"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copiar
              </>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="mt-4 text-sm text-emerald-800 underline"
        >
          Crear otro admin
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
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear admin local"}
      </button>
    </form>
  );
}
