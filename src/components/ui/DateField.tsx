"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

interface DateFieldProps {
  name: string;
  id?: string;
  /** ISO YYYY-MM-DD — uncontrolled initial value (ignored si `value` se pasa). */
  defaultValue?: string;
  /** ISO YYYY-MM-DD — modo controlled (toma precedencia sobre defaultValue). */
  value?: string;
  /** ISO YYYY-MM-DD — fechas anteriores se deshabilitan. */
  min?: string;
  required?: boolean;
  hasError?: boolean;
  placeholder?: string;
  onChange?: (iso: string) => void;
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

function formatES(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DateField({
  name,
  id,
  defaultValue,
  value,
  min,
  required,
  hasError,
  placeholder = "Elegir fecha",
  onChange,
}: DateFieldProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<Date | undefined>(
    parseISO(defaultValue)
  );
  const selected = isControlled ? parseISO(value) : internal;
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

  // Calcula posición del popup en coords viewport + reposiciona en scroll/resize.
  useEffect(() => {
    if (!open) return;

    function reposition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const popupWidth = 300; // ancho aprox del calendario compacto
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
      if (
        containerRef.current?.contains(t) ||
        popupRef.current?.contains(t)
      ) {
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

  const minDate = parseISO(min);

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
          !selected && "text-muted-foreground"
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected ? formatES(selected) : placeholder}
        </span>
        <CalendarIcon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
      <input
        type="hidden"
        name={name}
        value={toISO(selected)}
        required={required}
      />
      {open && mounted && coords &&
        createPortal(
          <div
            ref={popupRef}
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-3 shadow-2xl"
            role="dialog"
          >
            <DayPicker
              mode="single"
              selected={selected}
              // Si no hay valor seleccionado pero hay `min` (ej: "Hasta" en un
              // par Desde/Hasta), abrimos el calendario en el mes del mínimo
              // para que no haya que navegar de hoy hasta la fecha relevante.
              defaultMonth={selected ?? minDate ?? new Date()}
              onSelect={(d) => {
                if (!isControlled) setInternal(d);
                if (d) {
                  onChange?.(toISO(d));
                  setOpen(false);
                }
              }}
              disabled={minDate ? { before: minDate } : undefined}
              locale={es}
              weekStartsOn={1}
              showOutsideDays
              captionLayout="dropdown"
              startMonth={
                minDate && minDate.getFullYear() < new Date().getFullYear()
                  ? new Date(minDate.getFullYear(), 0)
                  : new Date(new Date().getFullYear(), 0)
              }
              endMonth={new Date(new Date().getFullYear() + 2, 11)}
              className="datefield-picker"
            />
          </div>,
          document.body
        )}
    </div>
  );
}
