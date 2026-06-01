"use client";

import {
  useState,
  useTransition,
  useId,
  useRef,
  useEffect,
  type FormEvent,
} from "react";
import Image from "next/image";
import { CheckCircle2, Users, Bed, Minus, Plus } from "lucide-react";
import { createConsultaAction } from "@/features/consultas/lib/consulta-actions";
import type { UnidadSugerida } from "@/features/consultas/lib/types";
import { UnidadAmenitiesList } from "@/features/unidades/components/UnidadAmenitiesList";
import { DateField } from "@/components/ui/DateField";
import { todayISO, tomorrowISO, addDaysISO } from "@/lib/date";
import { getFotoUrl } from "@/lib/storage";

interface Props {
  hospedajeId: string;
  hospedajeNombre: string;
  capacidadMax?: number | null;
  /** Valores heredados del buscador principal (vía URL), para no recargarlos. */
  initialCheckIn?: string;
  initialCheckOut?: string;
  /** Desglose de huéspedes heredado del buscador (mismo formato que el hero). */
  initialAdultos?: number;
  initialNinos?: number;
  initialBebes?: number;
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
  initialCheckIn,
  initialCheckOut,
  initialAdultos,
  initialNinos,
  initialBebes,
}: Props) {
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [sugeridas, setSugeridas] = useState<UnidadSugerida[]>([]);

  const refs: Record<FieldKey, React.RefObject<HTMLElement | null>> = {
    nombre: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    whatsapp: useRef<HTMLInputElement | null>(null),
    checkIn: useRef<HTMLDivElement | null>(null),
    checkOut: useRef<HTMLDivElement | null>(null),
    cantidadHuespedes: useRef<HTMLDivElement | null>(null),
    mensaje: useRef<HTMLTextAreaElement | null>(null),
    consentimiento: useRef<HTMLInputElement | null>(null),
  };

  const [checkIn, setCheckIn] = useState<string>(initialCheckIn ?? todayISO());
  const [checkOut, setCheckOut] = useState<string>(
    initialCheckOut ?? tomorrowISO()
  );

  // Huéspedes: mismo desglose que el buscador principal (adultos/niños/bebés).
  // Los bebés son informativos y no cuentan para la capacidad.
  const [adultos, setAdultos] = useState<number>(initialAdultos ?? 2);
  const [ninos, setNinos] = useState<number>(initialNinos ?? 0);
  const [bebes, setBebes] = useState<number>(initialBebes ?? 0);
  const maxCap = capacidadMax ?? 20;
  const totalCapacidad = adultos + ninos;

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

    // El modelo solo guarda el total, así que adjuntamos el desglose de pax
    // (adultos/niños/bebés) al mensaje para que el responsable lo reciba.
    const userMensaje = String(formData.get("mensaje") ?? "").trim();
    const paxParts = [`${adultos} ${adultos === 1 ? "adulto" : "adultos"}`];
    if (ninos > 0) paxParts.push(`${ninos} ${ninos === 1 ? "niño" : "niños"}`);
    if (bebes > 0) paxParts.push(`${bebes} ${bebes === 1 ? "bebé" : "bebés"}`);
    const paxLine = `Huéspedes: ${paxParts.join(", ")}.`;
    const mensaje =
      userMensaje && userMensaje.length + paxLine.length + 2 <= 1000
        ? `${userMensaje}\n\n${paxLine}`
        : userMensaje;

    const input = {
      hospedajeId,
      nombre: String(formData.get("nombre") ?? ""),
      email: String(formData.get("email") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      mensaje,
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
      setSugeridas(res.unidadesSugeridas ?? []);
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <CheckCircle2
            className="mx-auto h-10 w-10 text-emerald-600"
            aria-hidden
          />
          <h3 className="mt-3 font-display text-xl tracking-tight text-emerald-900">
            Consulta enviada
          </h3>
          <p className="mt-2 text-sm text-emerald-800">
            Le avisamos al responsable de <strong>{hospedajeNombre}</strong>.
            Te van a contestar al email o WhatsApp que dejaste.
          </p>
        </div>

        {sugeridas.length > 0 ? (
          <div>
            <h4 className="font-display text-lg tracking-tight">
              {sugeridas.length === 1
                ? "Esta unidad se ajusta a lo que pediste"
                : `${sugeridas.length} unidades se ajustan a lo que pediste`}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Capacidad mínima cumplida y libres en las fechas indicadas. El
              responsable te confirma la opción final.
            </p>
            <ul className="mt-4 space-y-3">
              {sugeridas.map((u) => {
                const fotoUrl = u.foto_storage_path
                  ? getFotoUrl(u.foto_storage_path)
                  : getFotoUrl("placeholders/apart-1.jpg");
                return (
                  <li
                    key={u.unidad_type_id}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={fotoUrl}
                        alt={u.foto_alt ?? u.nombre}
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{u.nombre}</p>
                        {u.unidades_totales > 1 && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {u.unidades_libres} de {u.unidades_totales} libres
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" aria-hidden />
                          {u.capacidad_total}{" "}
                          {u.capacidad_total === 1 ? "persona" : "personas"}
                        </span>
                        {u.camas_descripcion && (
                          <span className="inline-flex items-center gap-1">
                            <Bed className="h-3.5 w-3.5" aria-hidden />
                            {u.camas_descripcion}
                          </span>
                        )}
                      </div>
                      {u.amenities.length > 0 && (
                        <UnidadAmenitiesList
                          amenities={u.amenities}
                          max={4}
                          className="mt-1.5"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card p-4 text-center text-sm text-muted-foreground">
            En las fechas que pediste no encontramos unidades libres con esa
            capacidad. El responsable puede ofrecerte alternativas — esperá su
            respuesta.
          </div>
        )}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <div ref={refs.checkIn as React.RefObject<HTMLDivElement>}>
          <label className="text-sm font-medium" htmlFor={`${formId}-checkIn`}>
            Check-in
          </label>
          <DateField
            id={`${formId}-checkIn`}
            name="checkIn"
            value={checkIn}
            min={todayISO()}
            required
            hasError={!!fe("checkIn")}
            onChange={(iso) => {
              setCheckIn(iso);
              // Si el checkOut quedó <= checkIn, ajustamos al día siguiente.
              if (iso && checkOut && iso >= checkOut) {
                setCheckOut(addDaysISO(iso, 1));
              }
            }}
          />
          {fe("checkIn") && (
            <p className="mt-1 text-xs text-rose-600">{fe("checkIn")}</p>
          )}
        </div>
        <div ref={refs.checkOut as React.RefObject<HTMLDivElement>}>
          <label className="text-sm font-medium" htmlFor={`${formId}-checkOut`}>
            Check-out
          </label>
          <DateField
            id={`${formId}-checkOut`}
            name="checkOut"
            value={checkOut}
            min={checkIn ? addDaysISO(checkIn, 1) : tomorrowISO()}
            required
            hasError={!!fe("checkOut")}
            onChange={(iso) => setCheckOut(iso)}
          />
          {fe("checkOut") && (
            <p className="mt-1 text-xs text-rose-600">{fe("checkOut")}</p>
          )}
        </div>
      </div>

      <div ref={refs.cantidadHuespedes as React.RefObject<HTMLDivElement>}>
        <label className="text-sm font-medium">Huéspedes</label>
        <div className="mt-2 flex flex-col gap-1 rounded-md border border-input bg-background px-3 py-1.5">
          <Counter
            label="Adultos"
            hint="13 años o más"
            value={adultos}
            min={1}
            disableInc={totalCapacidad >= maxCap}
            onChange={setAdultos}
          />
          <Counter
            label="Niños"
            hint="2 a 12 años"
            value={ninos}
            disableInc={totalCapacidad >= maxCap}
            onChange={setNinos}
          />
          <Counter
            label="Bebés"
            hint="menos de 2 — no pagan, informativo"
            value={bebes}
            max={10}
            onChange={setBebes}
          />
        </div>
        {/* El modelo guarda un único total; los bebés no cuentan capacidad. */}
        <input type="hidden" name="cantidadHuespedes" value={totalCapacidad} />
        {capacidadMax != null && totalCapacidad >= capacidadMax && (
          <p className="mt-1 text-xs text-muted-foreground">
            Capacidad máxima del hospedaje: {capacidadMax}{" "}
            {capacidadMax === 1 ? "persona" : "personas"}.
          </p>
        )}
        {fe("cantidadHuespedes") && (
          <p className="mt-1 text-xs text-rose-600">
            {fe("cantidadHuespedes")}
          </p>
        )}
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

/** Contador de huéspedes con el mismo formato que el buscador principal. */
function Counter({
  label,
  hint,
  value,
  min = 0,
  max = 20,
  disableInc,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  disableInc?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Quitar ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span
          className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disableInc ?? value >= max}
          aria-label={`Agregar ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
