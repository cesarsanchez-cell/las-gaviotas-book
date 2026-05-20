"use client";

import { useState, useId, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, Minus, Plus } from "lucide-react";
import { DateField } from "@/components/ui/DateField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  destinoSlug: string;
  /** Valores iniciales (la página de resultados los pasa cuando se re-renderiza). */
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultAdultos?: number;
  defaultNinos?: number;
  defaultBebes?: number;
  className?: string;
  /** Si el buscador vive en hero (más grande) o inline (compacto). */
  variant?: "hero" | "inline";
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

interface CounterProps {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}

function Counter({ label, hint, value, min = 0, max = 20, onChange }: CounterProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Quitar ${label.toLowerCase()}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Agregar ${label.toLowerCase()}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function BuscadorBar({
  destinoSlug,
  defaultCheckIn,
  defaultCheckOut,
  defaultAdultos = 2,
  defaultNinos = 0,
  defaultBebes = 0,
  className,
  variant = "hero",
}: Props) {
  const router = useRouter();
  const baseId = useId();
  const [checkIn, setCheckIn] = useState<string>(defaultCheckIn ?? todayISO());
  const [checkOut, setCheckOut] = useState<string>(
    defaultCheckOut ?? tomorrowISO()
  );
  const [adultos, setAdultos] = useState<number>(defaultAdultos);
  const [ninos, setNinos] = useState<number>(defaultNinos);
  const [bebes, setBebes] = useState<number>(defaultBebes);
  const [paxOpen, setPaxOpen] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      adultos: String(adultos),
      ninos: String(ninos),
      bebes: String(bebes),
    });
    router.push(`/${destinoSlug}/buscar?${params.toString()}`);
  }

  const paxTotal = adultos + ninos + bebes;
  const paxLabel = (() => {
    const parts: string[] = [];
    parts.push(`${adultos} ${adultos === 1 ? "adulto" : "adultos"}`);
    if (ninos > 0) parts.push(`${ninos} ${ninos === 1 ? "niño" : "niños"}`);
    if (bebes > 0) parts.push(`${bebes} ${bebes === 1 ? "bebé" : "bebés"}`);
    return parts.join(", ");
  })();

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-2xl border border-border bg-card p-3 shadow-sm md:p-4",
        variant === "hero" && "md:shadow-md",
        className
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${baseId}-ci`}>
            Check-in
          </label>
          <DateField
            id={`${baseId}-ci`}
            name="check_in"
            value={checkIn}
            min={todayISO()}
            onChange={(iso) => {
              setCheckIn(iso);
              if (iso && checkOut && iso >= checkOut) {
                setCheckOut(addDays(iso, 1));
              }
            }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${baseId}-co`}>
            Check-out
          </label>
          <DateField
            id={`${baseId}-co`}
            name="check_out"
            value={checkOut}
            min={checkIn ? addDays(checkIn, 1) : tomorrowISO()}
            onChange={(iso) => setCheckOut(iso)}
          />
        </div>
        <div className="relative">
          <label className="text-xs font-medium text-muted-foreground">
            Huéspedes
          </label>
          <button
            type="button"
            onClick={() => setPaxOpen((v) => !v)}
            className="mt-1 flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-haspopup="dialog"
            aria-expanded={paxOpen}
          >
            <span className="truncate text-left">
              {paxTotal === 0 ? "Sin huéspedes" : paxLabel}
            </span>
          </button>
          {paxOpen && (
            <div
              className="absolute left-0 right-0 z-20 mt-2 space-y-3 rounded-lg border border-border bg-card p-4 shadow-lg md:right-auto md:w-72"
              onMouseLeave={() => setPaxOpen(false)}
            >
              <Counter
                label="Adultos"
                hint="13 años o más"
                value={adultos}
                min={1}
                onChange={setAdultos}
              />
              <Counter
                label="Niños"
                hint="2 a 12 años"
                value={ninos}
                onChange={setNinos}
              />
              <Counter
                label="Bebés"
                hint="menos de 2 — no pagan, informativo"
                value={bebes}
                onChange={setBebes}
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPaxOpen(false)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="md:self-end">
          <Button type="submit" size="lg" className="w-full md:w-auto">
            <Search className="h-4 w-4" />
            Buscar
          </Button>
        </div>
      </div>
    </form>
  );
}
