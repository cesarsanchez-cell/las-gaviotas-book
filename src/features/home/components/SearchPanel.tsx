"use client";

import * as React from "react";
import { Search, LocateFixed, X, Map, MapPin, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_GASTRONOMICO,
  CATEGORIAS_ATRACTIVO,
} from "@/config/categorias-lugar";
import type {
  DestinoPublicadoLite,
  RegionVisible,
} from "@/features/home/lib/queries";
import type { SearchState, HubTab } from "@/features/home/lib/search-types";

const GASTRO_TIPOS = Object.values(CATEGORIAS_GASTRONOMICO).map((c) => c.label);
const ATRACTIVO_TIPOS = Object.values(CATEGORIAS_ATRACTIVO).map((c) => c.label);

const CHIPS_CUANDO_HOSPEDAJE = [
  "Este finde",
  "Finde largo",
  "Una semana",
  "Quincena",
  "Sin fecha aún",
];
const CHIPS_CUANDO_OTROS = ["Hoy", "Este finde", "Esta semana", "Cualquier día"];

type Step = "donde" | "tipo" | "cuando" | "quien";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  search: SearchState;
  onApply: (s: SearchState) => void;
  destinos: DestinoPublicadoLite[];
  regiones: RegionVisible[];
  vertical: HubTab;
  onUseGeo: () => void;
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
  regiones,
  vertical,
  onUseGeo,
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

  const esHospedaje = vertical === "hospedajes";
  const showTipo = vertical === "gastronomia" || vertical === "atractivos";
  const tipos = vertical === "gastronomia" ? GASTRO_TIPOS : ATRACTIVO_TIPOS;

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

  const matches = React.useMemo(() => {
    if (!donde || donde.length < 2) return [] as Array<
      { type: "destino" | "region"; nombre: string; sub: string }
    >;
    const q = donde.toLowerCase();
    const dRes = destinos
      .filter((d) => d.nombre.toLowerCase().includes(q))
      .slice(0, 4)
      .map((d) => ({
        type: "destino" as const,
        nombre: d.nombre,
        sub: [d.region_label, d.pais].filter(Boolean).join(" · "),
      }));
    const rRes = regiones
      .filter((r) => r.nombre.toLowerCase().includes(q))
      .slice(0, 3)
      .map((r) => ({
        type: "region" as const,
        nombre: r.nombre,
        sub: "Región",
      }));
    return [...dRes, ...rRes];
  }, [donde, destinos, regiones]);

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

  function useGeo() {
    onUseGeo();
    onClose();
  }

  // Si la fecha de salida queda incoherente al cambiar la entrada, la limpiamos.
  function onChangeFechaIn(v: string) {
    setFechaIn(v);
    setCuando("");
    if (fechaOut && v && fechaOut <= v) setFechaOut("");
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

        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Cada campo es opcional. Con solo el destino te mostramos sus lugares;
          sin destino, podés ver lo que hay cerca tuyo.
        </p>

        <div className="flex flex-col gap-2 overflow-y-auto p-4">
          {/* Dónde */}
          <section>
            <button type="button" className={secHeadClass} onClick={() => setStep("donde")}>
              <span className="text-sm font-medium text-foreground">Dónde</span>
              <span className="truncate text-sm text-muted-foreground">
                {donde || "Ciudad, región o país"}
              </span>
            </button>
            {step === "donde" && (
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-3">
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
                  <button
                    type="button"
                    onClick={useGeo}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
                  >
                    <LocateFixed className="h-4 w-4" aria-hidden />
                    Mi ubicación
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {matches.map((m) => (
                      <li key={m.type + m.nombre}>
                        <button
                          type="button"
                          onClick={() => setDonde(m.nombre)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-secondary"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                            {m.type === "region" ? (
                              <Map className="h-4 w-4" aria-hidden />
                            ) : (
                              <MapPin className="h-4 w-4" aria-hidden />
                            )}
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
                {cuando || (esHospedaje ? "Elegí fechas" : "Cualquier día")}
              </span>
            </button>
            {step === "cuando" && (
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap gap-2">
                  {(esHospedaje ? CHIPS_CUANDO_HOSPEDAJE : CHIPS_CUANDO_OTROS).map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={chipClass(cuando === opt)}
                        onClick={() => {
                          setCuando(cuando === opt ? "" : opt);
                          setFechaIn("");
                          setFechaOut("");
                        }}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    O elegí la fecha exacta
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {esHospedaje ? "Check-in" : "Desde"}
                      <input
                        type="date"
                        value={fechaIn}
                        onChange={(e) => onChangeFechaIn(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </label>
                    {esHospedaje && (
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        Check-out
                        <input
                          type="date"
                          value={fechaOut}
                          min={fechaIn || undefined}
                          onChange={(e) => {
                            setFechaOut(e.target.value);
                            setCuando("");
                          }}
                          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                        />
                      </label>
                    )}
                  </div>
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
