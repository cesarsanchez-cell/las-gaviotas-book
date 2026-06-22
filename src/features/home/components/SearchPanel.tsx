"use client";

import * as React from "react";
import { Search, X, MapPin, Minus, Plus } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_GASTRONOMICO,
  CATEGORIAS_ATRACTIVO,
} from "@/config/categorias-lugar";
import type { DestinoPublicadoLite } from "@/features/home/lib/queries";
import type { SearchState, HubTab } from "@/features/home/lib/search-types";

const GASTRO_TIPOS = Object.values(CATEGORIAS_GASTRONOMICO).map((c) => c.label);
const ATRACTIVO_TIPOS = Object.values(CATEGORIAS_ATRACTIVO).map((c) => c.label);

type Step = "donde" | "tipo" | "cuando" | "quien";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  search: SearchState;
  onApply: (s: SearchState) => void;
  destinos: DestinoPublicadoLite[];
  /** Vertical activa; null = landing (busca hospedajes por defecto). */
  vertical: HubTab | null;
}

/** ISO de hoy (local) para impedir elegir fechas pasadas. */
function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** ISO YYYY-MM-DD → Date local (o undefined). */
function parseISO(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Date → ISO YYYY-MM-DD local (o ""). */
function toISO(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function fmtFecha(s: string): string {
  if (!s) return "";
  return new Date(s + "T00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

export function SearchPanel({
  open,
  onClose,
  search,
  onApply,
  destinos,
  vertical,
}: SearchPanelProps) {
  const [donde, setDonde] = React.useState(search.donde);
  const [cuando, setCuando] = React.useState(search.cuando);
  const [fechaIn, setFechaIn] = React.useState(search.fechas.in);
  const [fechaOut, setFechaOut] = React.useState(search.fechas.out);
  const [tipo, setTipo] = React.useState(search.tipo);
  const [adultos, setAdultos] = React.useState(search.pax.adultos);
  const [menores, setMenores] = React.useState(search.pax.menores);
  const [bebes, setBebes] = React.useState(search.pax.bebes);
  const [step, setStep] = React.useState<Step>("donde");

  // En landing (vertical null) la búsqueda es de hospedajes (disponibilidad).
  const esHospedaje = vertical === "hospedajes" || vertical === null;
  const showTipo = vertical === "gastronomia" || vertical === "atractivos";
  const tipos = vertical === "gastronomia" ? GASTRO_TIPOS : ATRACTIVO_TIPOS;
  const hoy = todayISO();

  // Bloquear scroll del body mientras el panel está abierto + Escape para cerrar.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // El buscador sugiere SOLO destinos (la región es contexto, no una opción).
  // Sin texto, listamos los destinos habilitados; al tipear, matcheamos por
  // nombre del destino O por su región — así escribir la zona ("Córdoba",
  // "Costa") encuentra sus destinos. `destinos` ya viene filtrado a publicados.
  const matches = React.useMemo(() => {
    const q = donde.trim().toLowerCase();
    return destinos
      .filter(
        (d) =>
          !q ||
          d.nombre.toLowerCase().includes(q) ||
          (d.region_label?.toLowerCase().includes(q) ?? false) ||
          (d.ciudad_label?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 8)
      .map((d) => ({
        nombre: d.nombre,
        // Contexto de orientación: la región (ej. "Costa Atlántica Bonaerense").
        // País como fallback solo si el destino no tiene región vinculada.
        sub: d.region_label ?? d.pais ?? "",
      }));
  }, [donde, destinos]);

  if (!open) return null;

  function apply() {
    const pax = adultos + menores + bebes;
    const cuandoLabel = fechaIn
      ? fechaOut
        ? `${fmtFecha(fechaIn)} → ${fmtFecha(fechaOut)}`
        : fmtFecha(fechaIn)
      : cuando;
    onApply({
      donde,
      cuando: cuandoLabel,
      tipo,
      quien: esHospedaje && pax > 0 ? `${pax} ${pax === 1 ? "viajero" : "viajeros"}` : "",
      pax: { adultos, menores, bebes },
      fechas: { in: fechaIn, out: fechaOut },
    });
    onClose();
  }

  function clearAll() {
    setDonde("");
    setCuando("");
    setTipo("");
    setFechaIn("");
    setFechaOut("");
    setAdultos(2);
    setMenores(0);
    setBebes(0);
  }

  // Rango seleccionado en el calendario (modo hospedaje).
  const rangeSelected: DateRange | undefined = fechaIn
    ? { from: parseISO(fechaIn) as Date, to: parseISO(fechaOut) }
    : undefined;

  function onSelectRange(range: DateRange | undefined) {
    setFechaIn(toISO(range?.from));
    setFechaOut(toISO(range?.to));
    setCuando("");
  }

  function onSelectSingle(d: Date | undefined) {
    setFechaIn(toISO(d));
    setFechaOut("");
    setCuando("");
  }

  const secHeadClass =
    "flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-secondary/50";
  const chipClass = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-sm transition",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-secondary"
    );

  return (
    <div role="dialog" aria-modal="true" aria-label="Buscar" className="fixed inset-0 z-[100]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />
      <div className="absolute inset-x-0 top-0 mx-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-b-2xl bg-background shadow-xl sm:inset-x-auto sm:left-1/2 sm:top-6 sm:-translate-x-1/2 sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition hover:bg-secondary"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          <p className="font-display text-lg tracking-tight">Buscar tu escapada</p>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Limpiar
          </button>
        </header>

        <div className="flex flex-col gap-2 overflow-y-auto p-4 pt-3">
          {/* Dónde */}
          <section>
            <button type="button" className={secHeadClass} onClick={() => setStep("donde")}>
              <span className="text-sm font-medium text-foreground">Dónde</span>
              <span className="truncate text-sm text-muted-foreground">
                {donde || "Elegí destino"}
              </span>
            </button>
            {step === "donde" && (
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 rounded-lg border border-border px-3">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    autoFocus
                    placeholder="ej: Las Gaviotas · Sierras de Córdoba"
                    value={donde}
                    onChange={(e) => setDonde(e.target.value)}
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  />
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {matches.map((m) => (
                      <li key={m.nombre}>
                        <button
                          type="button"
                          onClick={() => setDonde(m.nombre)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-secondary"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                            <MapPin className="h-4 w-4" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {m.nombre}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {m.sub}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Tipo — gastronomía / qué hacer */}
          {showTipo && (
            <section>
              <button type="button" className={secHeadClass} onClick={() => setStep("tipo")}>
                <span className="text-sm font-medium text-foreground">
                  {vertical === "gastronomia" ? "Qué tipo" : "Qué buscás"}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {tipo ||
                    (vertical === "gastronomia"
                      ? "Bar, resto, parador…"
                      : "Playas, miradores, cultura…")}
                </span>
              </button>
              {step === "tipo" && (
                <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3">
                  {tipos.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={chipClass(tipo === t)}
                      onClick={() => setTipo(tipo === t ? "" : t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Cuándo */}
          <section>
            <button type="button" className={secHeadClass} onClick={() => setStep("cuando")}>
              <span className="text-sm font-medium text-foreground">Cuándo</span>
              <span className="truncate text-sm text-muted-foreground">
                {fechaIn
                  ? fechaOut
                    ? `${fmtFecha(fechaIn)} → ${fmtFecha(fechaOut)}`
                    : fmtFecha(fechaIn)
                  : esHospedaje
                    ? "Elegí fechas"
                    : "Elegí el día"}
              </span>
            </button>
            {step === "cuando" && (
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                {esHospedaje && fechaIn && (
                  <p className="mb-2 text-center text-sm font-medium text-foreground">
                    {fmtFecha(fechaIn)}
                    {fechaOut ? ` → ${fmtFecha(fechaOut)}` : " · elegí la salida"}
                  </p>
                )}
                <div className="flex justify-center">
                    {esHospedaje ? (
                      <DayPicker
                        mode="range"
                        locale={es}
                        weekStartsOn={1}
                        numberOfMonths={1}
                        disabled={{ before: parseISO(hoy) as Date }}
                        defaultMonth={parseISO(fechaIn) ?? new Date()}
                        selected={rangeSelected}
                        onSelect={onSelectRange}
                      />
                    ) : (
                      <DayPicker
                        mode="single"
                        locale={es}
                        weekStartsOn={1}
                        numberOfMonths={1}
                        disabled={{ before: parseISO(hoy) as Date }}
                        defaultMonth={parseISO(fechaIn) ?? new Date()}
                        selected={parseISO(fechaIn)}
                        onSelect={onSelectSingle}
                      />
                    )}
                </div>
              </div>
            )}
          </section>

          {/* Quién — solo hospedajes */}
          {esHospedaje && (
            <section>
              <button type="button" className={secHeadClass} onClick={() => setStep("quien")}>
                <span className="text-sm font-medium text-foreground">Quién</span>
                <span className="truncate text-sm text-muted-foreground">
                  {adultos + menores + bebes > 0
                    ? [
                        adultos && `${adultos} ad.`,
                        menores && `${menores} men.`,
                        bebes && `${bebes} beb.`,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Agregá viajeros"}
                </span>
              </button>
              {step === "quien" && (
                <div className="mt-2 flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
                  <Counter label="Adultos" hint="13 años o más" value={adultos} min={1} onChange={setAdultos} />
                  <Counter label="Menores" hint="2 a 12 años" value={menores} onChange={setMenores} />
                  <Counter label="Bebés" hint="menos de 2 — no pagan" value={bebes} onChange={setBebes} />
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="border-t border-border p-4">
          <button
            type="button"
            onClick={apply}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden />
            Buscar
          </button>
        </footer>
      </div>
    </div>
  );
}

function Counter({
  label,
  hint,
  value,
  min = 0,
  max = 20,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Quitar ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary disabled:opacity-40"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span className="w-5 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Agregar ${label.toLowerCase()}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
