"use client";

import { useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import {
  createResponsableAction,
  type HospedajeOption,
} from "@/features/admin/lib/responsable-management";

interface Props {
  hospedajes: HospedajeOption[];
  /** Si true, agrupa el dropdown por destino (útil para super admin). */
  showDestino: boolean;
}

interface SuccessState {
  email: string;
  tempPassword: string;
}

export function NewResponsableForm({ hospedajes, showDestino }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleHospedaje(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setSuccess(null);
    setCopied(false);

    const input = {
      email: String(formData.get("email") ?? "").trim(),
      nombre: String(formData.get("nombre") ?? "").trim(),
      hospedajeIds: selected,
    };

    startTransition(async () => {
      const res = await createResponsableAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (res.ok && res.tempPassword && res.email) {
        setSuccess({ email: res.email, tempPassword: res.tempPassword });
        setSelected([]);
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
        <p className="font-medium text-emerald-900">Responsable creado.</p>
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
          Crear otro responsable
        </button>
      </div>
    );
  }

  // Agrupar hospedajes por destino si showDestino
  const grouped = new Map<string, HospedajeOption[]>();
  for (const h of hospedajes) {
    const key = showDestino ? h.destinoNombre : "all";
    const arr = grouped.get(key) ?? [];
    arr.push(h);
    grouped.set(key, arr);
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
          <label className="text-sm font-medium" htmlFor="resp-nombre">
            Nombre
          </label>
          <input
            id="resp-nombre"
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
          <label className="text-sm font-medium" htmlFor="resp-email">
            Email
          </label>
          <input
            id="resp-email"
            name="email"
            type="email"
            required
            placeholder="hola@hospedaje.com"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">
          Hospedajes a asignar{" "}
          <span className="font-normal text-muted-foreground">
            ({selected.length} seleccionado{selected.length === 1 ? "" : "s"})
          </span>
        </p>
        <div className="mt-2 max-h-56 space-y-3 overflow-y-auto rounded-md border border-input bg-background p-3">
          {Array.from(grouped.entries()).map(([destino, list]) => (
            <div key={destino}>
              {showDestino && (
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {destino}
                </p>
              )}
              <div className="space-y-1">
                {list.map((h) => (
                  <label
                    key={h.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(h.id)}
                      onChange={() => toggleHospedaje(h.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="flex-1">{h.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {fieldErrors.hospedajeIds && (
          <p className="mt-1 text-xs text-rose-600">
            {fieldErrors.hospedajeIds}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear responsable"}
      </button>
    </form>
  );
}
