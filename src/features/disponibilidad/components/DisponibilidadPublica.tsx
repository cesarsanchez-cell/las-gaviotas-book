import type { DiaBloqueado } from "@/features/disponibilidad/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  diasBloqueados: DiaBloqueado[] | { fecha: string }[];
  mesesVisibles?: number;
  /**
   * Modo compacto: 1 mes por defecto, celdas más chicas, sin leyenda ni
   * footer explicativo. Pensado para embeber en cards de unidad.
   */
  compact?: boolean;
}

const DAYS_OF_WEEK = ["L", "M", "M", "J", "V", "S", "D"];
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
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Calendario read-only de disponibilidad para la página pública del hospedaje.
 * Server component — no requiere interacción.
 */
export function DisponibilidadPublica({
  diasBloqueados,
  mesesVisibles,
  compact = false,
}: Props) {
  const meses = mesesVisibles ?? (compact ? 1 : 3);

  const today = todayLocal();
  const baseYear = today.getFullYear();
  const baseMonth = today.getMonth();

  const bloqueadosSet = new Set(diasBloqueados.map((b) => b.fecha));

  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < meses; i++) {
    const m = baseMonth + i;
    months.push({
      year: baseYear + Math.floor(m / 12),
      month: ((m % 12) + 12) % 12,
    });
  }

  const cellSize = compact ? "h-6 text-[11px]" : "h-7 text-xs";
  const dayHeaderSize = compact ? "text-[9px]" : "text-[10px]";

  return (
    <div>
      <div
        className={cn(
          "grid gap-5",
          compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {months.map(({ year, month }) => {
          const cells = buildMonthGrid(year, month);
          return (
            <div key={`${year}-${month}`}>
              <p
                className={cn(
                  "mb-2 font-display font-medium",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {MONTH_NAMES[month]} {year}
              </p>
              <div
                className={cn(
                  "grid grid-cols-7 gap-0.5 text-center text-muted-foreground",
                  dayHeaderSize
                )}
              >
                {DAYS_OF_WEEK.map((d, i) => (
                  <span key={`${d}-${i}`}>{d}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-0.5">
                {cells.map((cell, idx) => {
                  if (!cell)
                    return (
                      <span
                        key={idx}
                        className={cellSize.split(" ")[0]}
                        aria-hidden
                      />
                    );
                  const isBlocked = bloqueadosSet.has(cell.iso);
                  return (
                    <span
                      key={cell.iso}
                      title={
                        cell.isPast
                          ? "Fecha pasada"
                          : isBlocked
                            ? "Ocupado"
                            : "Disponible"
                      }
                      aria-label={
                        isBlocked
                          ? `${cell.day} ocupado`
                          : `${cell.day} disponible`
                      }
                      className={cn(
                        "flex items-center justify-center rounded-md",
                        cellSize,
                        cell.isPast
                          ? "text-muted-foreground/50"
                          : isBlocked
                            ? "bg-rose-100 text-rose-800 line-through"
                            : "bg-emerald-50 text-emerald-900"
                      )}
                    >
                      {cell.day}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" />
              Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-rose-100" />
              Ocupado
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Disponibilidad informativa cargada por el responsable. Confirmá
            fechas antes de viajar mandando una consulta.
          </p>
        </>
      )}
    </div>
  );
}
