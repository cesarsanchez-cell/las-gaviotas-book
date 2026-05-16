"use client";

import {
  useState,
  useTransition,
  useId,
  useRef,
  useEffect,
  type FormEvent,
} from "react";
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

// Orden en que buscamos el primer campo con error para mover el foco.
const FIELD_ORDER = [
  "nombre",
  "email",
  "whatsapp",
  "checkIn",
  "checkOut",
  "cantidadHuespedes",
  "mensaje",
  "consentimiento",
] as const;

type FieldKey = (typeof FIELD_ORDER)[number];

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

  const refs: Record<FieldKey, React.RefObject<HTMLElement | null>> = {
    nombre: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    whatsapp: useRef<HTMLInputElement | null>(null),
    checkIn: useRef<HTMLInputElement | null>(null),
    checkOut: useRef<HTMLInputElement | null>(null),
    cantidadHuespedes: useRef<HTMLInputElement | null>(null),
    mensaje: useRef<HTMLTextAreaElement | null>(null),
    consentimiento: useRef<HTMLInputElement | null>(null),
  };

  // Cuando llegan field errors, mover el foco al primer campo con error
  // (en el orden visual del form). NO se limpian los valores cargados —
  // como usamos onSubmit con preventDefault, React no resetea el form.
  useEffect(() => {
    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return;
    const firstKey = FIELD_ORDER.find((k) => keys.includes(k));
    if (firstKey) {
      const el = refs[firstKey].current;
      if (el && "focus" in el) (el as HTMLElement).focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
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
  const inputError =
    "border-rose-400 focus:ring-rose-300";
  const cls = (k: string) =>
    `${inputBase}${fieldErrors[k] ? ` ${inputError}` : ""}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" id={formId} noValidate>
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
            ref={refs.nombre as React.RefObject<HTMLInputElement>}
            className={cls("nombre")}
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
            ref={refs.email as React.RefObject<HTMLInputElement>}
            className={cls("email")}
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
          placeholder="1155555555"
          ref={refs.whatsapp as React.RefObject<HTMLInputElement>}
          className={cls("whatsapp")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Sin código de país: cargá tus 10 dígitos. Si sos del exterior usá el
          número completo con <code>+</code>.
        </p>
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
            ref={refs.checkIn as React.RefObject<HTMLInputElement>}
            className={cls("checkIn")}
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
            ref={refs.checkOut as React.RefObject<HTMLInputElement>}
            className={cls("checkOut")}
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
            ref={refs.cantidadHuespedes as React.RefObject<HTMLInputElement>}
            className={cls("cantidadHuespedes")}
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
          ref={refs.mensaje as React.RefObject<HTMLTextAreaElement>}
          className={cls("mensaje")}
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
          ref={refs.consentimiento as React.RefObject<HTMLInputElement>}
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
