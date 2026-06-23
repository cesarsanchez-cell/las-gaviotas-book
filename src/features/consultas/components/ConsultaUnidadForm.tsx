"use client";

import {
  useState,
  useTransition,
  useId,
  useRef,
  useEffect,
  type FormEvent,
} from "react";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { createConsultaUnidadAction } from "@/features/consultas/lib/consulta-unidad-actions";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface Props {
  hospedajeId: string;
  unidadTypeId: string;
  unidadNombre: string;
  hospedajeNombre: string;
  /** WhatsApp del alojamiento — para abrir el chat directo si el canal es WA. */
  hospedajeWhatsapp: string | null;
  /** Contexto del flow de búsqueda — preserva fechas y pax. */
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  bebes: number;
}

function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function paxResumen(adultos: number, ninos: number, bebes: number): string {
  const partes = [
    adultos ? `${adultos} adulto${adultos > 1 ? "s" : ""}` : "",
    ninos ? `${ninos} niño${ninos > 1 ? "s" : ""}` : "",
    bebes ? `${bebes} bebé${bebes > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return partes.join(", ");
}

const FIELD_ORDER = [
  "nombre",
  "email",
  "whatsapp",
  "canalPreferido",
  "mensaje",
  "consentimiento",
] as const;

type FieldKey = (typeof FIELD_ORDER)[number];
type Canal = "mail" | "whatsapp";

export function ConsultaUnidadForm({
  hospedajeId,
  unidadTypeId,
  unidadNombre,
  hospedajeNombre,
  hospedajeWhatsapp,
  checkIn,
  checkOut,
  adultos,
  ninos,
  bebes,
}: Props) {
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [canal, setCanal] = useState<Canal>("mail");
  // URL de WhatsApp del alojamiento (si el canal elegido fue WA y hay número).
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const refs: Record<FieldKey, React.RefObject<HTMLElement | null>> = {
    nombre: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    whatsapp: useRef<HTMLInputElement | null>(null),
    canalPreferido: useRef<HTMLDivElement | null>(null),
    mensaje: useRef<HTMLTextAreaElement | null>(null),
    consentimiento: useRef<HTMLInputElement | null>(null),
  };

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

    const fd = new FormData(e.currentTarget);
    const input = {
      hospedajeId,
      unidadTypeId,
      checkIn,
      checkOut,
      adultos,
      ninos,
      bebes,
      nombre: String(fd.get("nombre") ?? ""),
      email: String(fd.get("email") ?? ""),
      whatsapp: String(fd.get("whatsapp") ?? ""),
      mensaje: String(fd.get("mensaje") ?? ""),
      canalPreferido: canal,
      consentimiento: fd.get("consentimiento") === "on",
      company: String(fd.get("company") ?? ""),
    };

    startTransition(async () => {
      const res = await createConsultaUnidadAction(input);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }

      // Canal WhatsApp: además de guardar el lead, abrimos el chat del
      // alojamiento con la consulta ya escrita (el huésped solo aprieta enviar).
      if (canal === "whatsapp" && hospedajeWhatsapp) {
        const pax = paxResumen(adultos, ninos, bebes);
        const mensajeWa =
          `Hola! Soy ${input.nombre}. Quería consultar por ${unidadNombre} ` +
          `en ${hospedajeNombre}` +
          (checkIn && checkOut
            ? `, del ${formatDMY(checkIn)} al ${formatDMY(checkOut)}`
            : "") +
          (pax ? ` para ${pax}` : "") +
          `.\n\n${input.mensaje}`;
        const url = buildWhatsAppUrl({
          whatsapp: hospedajeWhatsapp,
          mensaje: mensajeWa,
        });
        setWaUrl(url);
        // Best-effort: intentamos abrirlo automáticamente. Si el navegador lo
        // bloquea (popup), queda el botón explícito en la pantalla de éxito.
        if (typeof window !== "undefined") {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }

      setSuccess(true);
    });
  }

  if (success) {
    // Caso WhatsApp: el lead quedó guardado y abrimos (o ofrecemos abrir) el
    // chat del alojamiento con la consulta lista.
    if (waUrl) {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <MessageCircle
            className="mx-auto h-10 w-10 text-emerald-600"
            aria-hidden
          />
          <h3 className="mt-3 font-display text-xl tracking-tight text-emerald-900">
            Te llevamos a WhatsApp
          </h3>
          <p className="mt-2 text-sm text-emerald-800">
            Tu consulta sobre <strong>{unidadNombre}</strong> quedó registrada y
            abrimos el WhatsApp de <strong>{hospedajeNombre}</strong> con el
            mensaje listo. Si no se abrió solo, tocá el botón:
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Abrir WhatsApp del alojamiento
          </a>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-emerald-600"
          aria-hidden
        />
        <h3 className="mt-3 font-display text-xl tracking-tight text-emerald-900">
          Consulta enviada
        </h3>
        <p className="mt-2 text-sm text-emerald-800">
          Le avisamos al responsable de <strong>{hospedajeNombre}</strong> que
          querés <strong>{unidadNombre}</strong> entre el{" "}
          <strong>{checkIn}</strong> y el <strong>{checkOut}</strong>. Te
          contesta por email a la brevedad.
        </p>
      </div>
    );
  }

  const fe = (k: string) => fieldErrors[k];
  const inputBase =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const inputError = "border-rose-400 focus:ring-rose-300";
  const cls = (k: string) =>
    `${inputBase}${fieldErrors[k] ? ` ${inputError}` : ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      id={formId}
      noValidate
    >
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

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
          WhatsApp{" "}
          {canal === "whatsapp" ? (
            <span className="text-rose-600">*</span>
          ) : (
            <span className="text-muted-foreground">(opcional)</span>
          )}
        </label>
        <input
          id={`${formId}-whatsapp`}
          name="whatsapp"
          type="tel"
          required={canal === "whatsapp"}
          placeholder="1155555555"
          ref={refs.whatsapp as React.RefObject<HTMLInputElement>}
          className={cls("whatsapp")}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Sin código de país: 10 dígitos. Si sos del exterior usá el número
          completo con <code>+</code>.
        </p>
        {fe("whatsapp") && (
          <p className="mt-1 text-xs text-rose-600">{fe("whatsapp")}</p>
        )}
      </div>

      <div ref={refs.canalPreferido as React.RefObject<HTMLDivElement>}>
        <p className="text-sm font-medium">¿Cómo querés contactar al alojamiento?</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Por email: dejás la consulta y el responsable te escribe. Por WhatsApp:
          te abrimos su chat con el mensaje listo para enviar.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition",
              canal === "mail"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground"
            )}
          >
            <input
              type="radio"
              name="canal"
              value="mail"
              checked={canal === "mail"}
              onChange={() => setCanal("mail")}
              className="sr-only"
            />
            <Mail
              className={cn(
                "h-4 w-4",
                canal === "mail" ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden
            />
            Por email
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm transition",
              canal === "whatsapp"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground"
            )}
          >
            <input
              type="radio"
              name="canal"
              value="whatsapp"
              checked={canal === "whatsapp"}
              onChange={() => setCanal("whatsapp")}
              className="sr-only"
            />
            <MessageCircle
              className={cn(
                "h-4 w-4",
                canal === "whatsapp" ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden
            />
            Por WhatsApp
          </label>
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
          placeholder="Contale algo más al responsable (preferencias, horarios de llegada, presupuesto)…"
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
          Acepto que mis datos sean compartidos con el responsable de{" "}
          <strong>{hospedajeNombre}</strong> para responder mi consulta sobre{" "}
          <strong>{unidadNombre}</strong>.
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
