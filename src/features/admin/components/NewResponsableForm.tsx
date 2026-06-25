"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { createResponsableAction } from "@/features/admin/lib/responsable-management";

export function NewResponsableForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [responsableName, setResponsableName] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setInviteLink(null);

    const input = {
      email: String(formData.get("email") ?? "").trim(),
      nombre: String(formData.get("nombre") ?? "").trim(),
      entidades: [], // No asignamos entidades aquí
    };

    startTransition(async () => {
      const res = await createResponsableAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      if (res.ok) {
        const params = new URLSearchParams({
          email: input.email,
          nombre: input.nombre,
        });
        setInviteLink(`${window.location.origin}/registro?${params.toString()}`);
        setResponsableName(input.nombre);
      }
    });
  }

  if (inviteLink) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden />
          <div className="flex-1">
            <p className="font-medium text-emerald-900">Listo, enviá por WhatsApp</p>
            <p className="mt-1 text-sm text-emerald-800">
              Copia este link y envíaselo a <strong>{responsableName}</strong>:
            </p>
            <div className="mt-2 rounded-md bg-white px-3 py-2">
              <code className="break-all text-xs text-muted-foreground">{inviteLink}</code>
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              Ahí se registra, confirma su email, y puede crear su hospedaje, gastronómico o atracción desde su panel.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setInviteLink(null);
            setResponsableName(null);
          }}
          className="mt-4 text-sm text-emerald-800 underline"
        >
          Invitar a otro responsable
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
          <label className="text-sm font-medium" htmlFor="resp-nombre">
            Nombre del responsable
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
            placeholder="maria@hospedaje.com"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        {pending ? "Generando link…" : "Generar link de invitación"}
      </button>
    </form>
  );
}
