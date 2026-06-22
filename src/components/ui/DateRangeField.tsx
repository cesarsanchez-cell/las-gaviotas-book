"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

interface DateRangeFieldProps {
  id?: string;
  /** ISO YYYY-MM-DD del check-in (controlado). */
  from: string;
  /** ISO YYYY-MM-DD del check-out (controlado). */
  to: string;
  /** ISO YYYY-MM-DD — fechas anteriores se deshabilitan. */
  min?: string;
  hasError?: boolean;
  placeholder?: string;
  onChange: (range: { from: string; to: string }) => void;
}

function parseISO(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISO(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Campo de rango de fechas (check-in → check-out) en un solo control con popover
 * de calendario de rango. Misma estética/mecánica de popover-portal que
 * DateField, pero `mode="range"`: un clic fija la entrada, el segundo la salida.
 */
export function DateRangeField({
  id,
  from,
  to,
  min,
  hasError,
  placeholder = "Elegí las fechas",
  onChange,
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const popupWidth = 300;
      const margin = 8;
      let left = r.left;
      if (left + popupWidth + margin > window.innerWidth) {
        left = Math.max(margin, window.innerWidth - popupWidth - margin);
      }
      setCoords({ top: r.bottom + 4, left });
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || popupRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const fromD = parseISO(from);
  const toD = parseISO(to);
  const minDate = parseISO(min);
  const selected: DateRange | undefined = fromD
    ? { from: fromD, to: toD }
    : undefined;

  const label = fromD
    ? toD
      ? `${fmtShort(fromD)} → ${fmtShort(toD)}`
      : `${fmtShort(fromD)} → elegí salida`
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
          hasError && "border-rose-400 focus:ring-rose-300",
          !fromD && "text-muted-foreground"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <CalendarIcon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
      {open &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={popupRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-3 shadow-2xl"
            role="dialog"
          >
            <DayPicker
              mode="range"
              selected={selected}
              defaultMonth={fromD ?? minDate ?? new Date()}
              // Manejo determinista: el 1er clic SIEMPRE reinicia la entrada
              // (sin esto, con un rango pre-cargado react-day-picker completa el
              // rango en el primer clic y cierra sin dejar elegir la salida).
              onDayClick={(day, modifiers) => {
                if (modifiers.disabled) return;
                const clickedISO = toISO(day);
                if (!fromD || toD || day <= fromD) {
                  onChange({ from: clickedISO, to: "" });
                  return; // queda abierto esperando la salida
                }
                onChange({ from, to: clickedISO });
                setOpen(false);
              }}
              disabled={minDate ? { before: minDate } : undefined}
              locale={es}
              weekStartsOn={1}
              showOutsideDays
              className="datefield-picker"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
