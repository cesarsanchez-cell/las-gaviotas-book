"use client";

import { useState, useTransition, useId } from "react";
import { CheckCircle2 } from "lucide-react";
import { createConsultaAction } from "@/features/consultas/lib/consulta-actions";

interface Props {
  hospedajeId: string;
  hospedajeNombre: string;
  capacidadMax?: number | null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

export function ConsultaForm({
  hospedajeId,
  hospedajeNombre,
  capacidadMax,
}: Props) {
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});

    const input = {
      hospedajeId,
      nombre: String(formData.get("nombre") ?? ""),
      email: String(formData.get("email") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      mensaje: String(formData.get("mensaje") ?? ""),
      checkIn: String(formData.get("checkIn") ?? ""),
      checkOut: String(formData.get("checkOut") ?? ""),
      cantidadHuespedes: Number(formData.get("cantidadHuespedes") ?? 1),
      consentimiento: formData.get("consentimiento") === "on",
      company: String(formData.get("company") ?? ""), // honeypot
    };

    startTransition(async () => {
      const res = await createConsultaAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <h3 className="mt-3 font-display text-xl tracking-tight text-emerald-900">
          Consulta enviada
        </h3>
        <p className="mt-2 text-sm text-emerald-800">
          Le avisamos al responsable de <strong>{hospedajeNombre}</strong>. Te
          van a contestar al email o WhatsApp que dejaste.
        </p>
      </div>
    );
  }

  const fe = (k: string) => fieldErrors[k];
  const inputBase =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <form action={handleSubmit} className="space-y-4" id={formId}>
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Honeypot — invisible al usuario, los bots lo llenan */}
      <div
        aria-hidden
        style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}
      >
        <label>
          No completar
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor={`${formId}-nombre`}>
            Nombre
          </label>
          <input
            id={`${formId}-nombre`}
            name="nombre"
            type="text"
            required
            minLength={2}
            maxLength={120}
            placeholder="María Pérez"
            className={inputBase}
          />
          {fe("nombre") && (
            <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor={`${formId}-email`}>
            Email
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            placeholder="maria@ejemplo.com"
            className={inputBase}
          />
          {fe("email") && (
            <p className="mt-1 text-xs text-rose-600">{fe("email")}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor={`${formId}-whatsapp`}>
          WhatsApp <span className="text-muted-foreground">(opcional)</span>
        </label>
        <input
          id={`${formId}-whatsapp`}
          name="whatsapp"
          type="tel"
          placeholder="+5491155555555"
          className={inputBase}
        />
        {fe("whatsapp") && (
          <p className="mt-1 text-xs text-rose-600">{fe("whatsapp")}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor={`${formId}-checkIn`}>
            Check-in
          </label>
          <input
            id={`${formId}-checkIn`}
            name="checkIn"
            type="date"
            required
            min={todayISO()}
            defaultValue={todayISO()}
            className={inputBase}
          />
          {fe("checkIn") && (
            <p className="mt-1 text-xs text-rose-600">{fe("checkIn")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor={`${formId}-checkOut`}>
            Check-out
          </label>
          <input
            id={`${formId}-checkOut`}
            name="checkOut"
            type="date"
            required
            min={tomorrowISO()}
            defaultValue={tomorrowISO()}
            className={inputBase}
          />
          {fe("checkOut") && (
            <p className="mt-1 text-xs text-rose-600">{fe("checkOut")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor={`${formId}-cant`}>
            Huéspedes
          </label>
          <input
            id={`${formId}-cant`}
            name="cantidadHuespedes"
            type="number"
            required
            min={1}
            max={capacidadMax ?? 20}
            defaultValue={2}
            className={inputBase}
          />
          {fe("cantidadHuespedes") && (
            <p className="mt-1 text-xs text-rose-600">
              {fe("cantidadHuespedes")}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor={`${formId}-mensaje`}>
          Mensaje
        </label>
        <textarea
          id={`${formId}-mensaje`}
          name="mensaje"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          placeholder="Contame qué necesitás (disponibilidad, precios, servicios incluidos…)"
          className={inputBase}
        />
        {fe("mensaje") && (
          <p className="mt-1 text-xs text-rose-600">{fe("mensaje")}</p>
        )}
      </div>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          name="consentimiento"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <span>
          Acepto que mis datos (nombre, email y WhatsApp si lo dejé) sean
          compartidos con el responsable de <strong>{hospedajeNombre}</strong> para responder mi consulta.
        </span>
      </label>
      {fe("consentimiento") && (
        <p className="text-xs text-rose-600">{fe("consentimiento")}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar consulta"}
      </button>
    </form>
  );
}
