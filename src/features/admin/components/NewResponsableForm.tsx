"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import {
  createResponsableAction,
  type HospedajeOption,
} from "@/features/admin/lib/responsable-management";

interface Props {
  hospedajes: HospedajeOption[];
  /** Si true, agrupa el dropdown por destino (útil para super admin). */
  showDestino: boolean;
}

export function NewResponsableForm({ hospedajes, showDestino }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  function toggleHospedaje(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setInvitedEmail(null);

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
      if (res.ok && res.email) {
        setInvitedEmail(res.email);
        setSelected([]);
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
          Invitar a otro responsable
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
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        {pending ? "Enviando invitación…" : "Enviar invitación"}
      </button>
    </form>
  );
}
