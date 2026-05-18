"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import {
  bloquearRangoAction,
  desbloquearRangoAction,
  toggleFechaAction,
} from "@/features/disponibilidad/lib/actions";
import type { DiaBloqueado } from "@/features/disponibilidad/lib/queries";
import type { UnidadRow } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  hospedajeNombre: string;
  /** Unidades físicas del hospedaje, activas e inactivas. La UI muestra solo activas. */
  unidades: UnidadRow[];
  /** Días bloqueados de TODAS las unidades del hospedaje en el rango cargado. */
  diasBloqueados: DiaBloqueado[];
  mesesVisibles?: number;
  /** Vista del admin: oculta controles, deshabilita clicks. */
  readOnly?: boolean;
}

const DAYS_OF_WEEK = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

interface DayCell {
  iso: string;
  day: number;
  isPast: boolean;
  isToday: boolean;
}

function buildMonthGrid(year: number, month: number): (DayCell | null)[] {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({
      iso: isoDate(date),
      day: d,
      isPast: date < today,
      isToday: date.getTime() === today.getTime(),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DisponibilidadCalendar({
  hospedajeNombre,
  unidades,
  diasBloqueados,
  mesesVisibles = 6,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const today = todayLocal();
  const unidadesActivas = useMemo(
    () => unidades.filter((u) => u.activa),
    [unidades]
  );

  const [unidadActivaId, setUnidadActivaId] = useState<string>(
    unidadesActivas[0]?.id ?? ""
  );
  const [offsetMes, setOffsetMes] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [rangoDesde, setRangoDesde] = useState<string>(isoDate(today));
  const [rangoHasta, setRangoHasta] = useState<string>(isoDate(today));
  const [rangoNotas, setRangoNotas] = useState<string>("");

  // Mapa fecha -> bloqueo, filtrado por unidad activa.
  const bloqueadosByDate = useMemo(() => {
    const m = new Map<string, DiaBloqueado>();
    for (const b of diasBloqueados) {
      if (b.unidad_id === unidadActivaId) m.set(b.fecha, b);
    }
    return m;
  }, [diasBloqueados, unidadActivaId]);

  // Conteo rápido de días ocupados por unidad para mostrar en cada tab.
  const ocupadosPorUnidad = useMemo(() => {
    const out = new Map<string, number>();
    for (const b of diasBloqueados) {
      out.set(b.unidad_id, (out.get(b.unidad_id) ?? 0) + 1);
    }
    return out;
  }, [diasBloqueados]);

  function handleToggle(iso: string) {
    setError(null);
    startTransition(async () => {
      const res = await toggleFechaAction({
        unidadId: unidadActivaId,
        fecha: iso,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleBloquearRango() {
    setError(null);
    startTransition(async () => {
      const res = await bloquearRangoAction({
        unidadId: unidadActivaId,
        desde: rangoDesde,
        hasta: rangoHasta,
        notas: rangoNotas.trim() || undefined,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDesbloquearRango() {
    setError(null);
    startTransition(async () => {
      const res = await desbloquearRangoAction({
        unidadId: unidadActivaId,
        desde: rangoDesde,
        hasta: rangoHasta,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const visibleMonths = useMemo(() => {
    const baseYear = today.getFullYear();
    const baseMonth = today.getMonth() + offsetMes;
    const items: Array<{ year: number; month: number }> = [];
    for (let i = 0; i < mesesVisibles; i++) {
      const m = baseMonth + i;
      const year = baseYear + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      items.push({ year, month });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetMes, mesesVisibles]);

  // Caso límite: hospedaje sin unidades activas. El componente igual se
  // renderiza para no romper la página, pero invita a cargar unidades.
  if (unidadesActivas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium">
          No hay unidades activas para gestionar disponibilidad.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Cargá al menos una unidad desde la sección{" "}
          <strong>Unidades</strong> del hospedaje y volvé acá para definir los
          días bloqueados.
        </p>
      </div>
    );
  }

  const unidadActiva = unidadesActivas.find((u) => u.id === unidadActivaId);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Tabs de unidades */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2">
        {unidadesActivas.map((u) => {
          const active = u.id === unidadActivaId;
          const ocupados = ocupadosPorUnidad.get(u.id) ?? 0;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => setUnidadActivaId(u.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{u.nombre}</span>
              {ocupados > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-rose-100 text-rose-800"
                  )}
                >
                  {ocupados}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!readOnly && unidadActiva && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-lg tracking-tight">
            Bloquear / desbloquear un rango · {unidadActiva.nombre}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aplica sobre la unidad seleccionada arriba. El rango bloquea{" "}
            <strong>desde y hasta inclusive</strong> (ambos días quedan ocupados).
            Si solo querés bloquear hoy, poné la misma fecha en ambos campos.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium" htmlFor="rango-desde">
                Desde
              </label>
              <input
                id="rango-desde"
                type="date"
                value={rangoDesde}
                min={isoDate(today)}
                onChange={(e) => setRangoDesde(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor="rango-hasta">
                Hasta
              </label>
              <input
                id="rango-hasta"
                type="date"
                value={rangoHasta}
                min={rangoDesde}
                onChange={(e) => setRangoHasta(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium" htmlFor="rango-notas">
                Notas (opcional)
              </label>
              <input
                id="rango-notas"
                type="text"
                value={rangoNotas}
                onChange={(e) => setRangoNotas(e.target.value)}
                placeholder="Feriado XL, refacción, etc."
                maxLength={200}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={handleBloquearRango}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              Bloquear rango
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleDesbloquearRango}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-50"
            >
              Liberar rango (solo manual)
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg tracking-tight">
              Calendario · {hospedajeNombre}
              {unidadActiva && (
                <span className="ml-2 text-base text-muted-foreground">
                  / {unidadActiva.nombre}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {readOnly
                ? "Vista de solo lectura. La disponibilidad la gestiona únicamente el responsable del hospedaje."
                : "Click sobre un día para alternar bloqueado/libre en la unidad seleccionada. Fondo rojo = ocupado. Reservas (Etapa futura) aparecerán en otro color y no se pueden tocar desde acá."}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending || offsetMes <= 0}
              onClick={() => setOffsetMes((o) => Math.max(0, o - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
            >
              <ChevronLeft className="h-3 w-3" />
              Anterior
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setOffsetMes((o) => o + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </header>

        <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleMonths.map(({ year, month }) => {
            const cells = buildMonthGrid(year, month);
            return (
              <div key={`${year}-${month}`}>
                <p className="mb-2 font-display text-sm font-medium">
                  {MONTH_NAMES[month]} {year}
                </p>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
                  {DAYS_OF_WEEK.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-0.5">
                  {cells.map((cell, idx) => {
                    if (!cell) return <span key={idx} />;
                    const block = bloqueadosByDate.get(cell.iso);
                    const isBlocked = !!block;
                    const isReserva = block?.tipo === "reserva";
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        disabled={
                          pending || cell.isPast || isReserva || readOnly
                        }
                        onClick={
                          readOnly ? undefined : () => handleToggle(cell.iso)
                        }
                        title={
                          cell.isPast
                            ? "Fecha pasada"
                            : isReserva
                              ? `Reserva ${
                                  block?.notas ? `· ${block.notas}` : ""
                                }`
                              : isBlocked
                                ? `Bloqueado ${
                                    block?.notas ? `· ${block.notas}` : ""
                                  } (click para liberar)`
                                : "Disponible (click para bloquear)"
                        }
                        className={cn(
                          "h-9 rounded-md text-xs transition disabled:cursor-not-allowed disabled:opacity-40",
                          cell.isPast && "text-muted-foreground/60",
                          !cell.isPast &&
                            !isBlocked &&
                            "bg-background hover:bg-muted",
                          isBlocked &&
                            !isReserva &&
                            "bg-rose-100 text-rose-800 hover:bg-rose-200",
                          isReserva && "bg-amber-100 text-amber-800",
                          cell.isToday && "ring-2 ring-primary/50"
                        )}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-background ring-1 ring-input" />
            Disponible
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-100" />
            Bloqueado manual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-100" />
            Ocupado por reserva
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm ring-2 ring-primary/50" />
            Hoy
          </span>
        </div>
      </section>
    </div>
  );
}
