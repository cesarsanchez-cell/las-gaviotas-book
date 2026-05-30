"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowDown,
  WandSparkles,
  BedDouble,
  UtensilsCrossed,
  Compass,
  Check,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

// =============================================================================
// Armador "Armá tu escapada" — wizard mobile-first de hasta 3 pasos (hospedaje
// → gastronomía → atractivo). El cliente elige uno de cada vertical disponible
// y el footer sticky deriva a un único WhatsApp al hospedaje ancla con la
// combinación armada.
//
// MVP (decisión 2026-05-30): SIN motor de reglas cruzadas y SIN precio
// estimado (gastro/atractivos no tienen tarifa cargada). WhatsApp al ancla.
// Las reglas de beneficios cruzados quedan para una etapa posterior.
// =============================================================================

export interface ArmadorItem {
  slug: string;
  nombre: string;
  sublabel: string;
  descripcion: string;
  fotoUrl: string | null;
  whatsapp: string | null;
}

type StepKey = "hospedaje" | "gastronomia" | "atractivo";

interface StepDef {
  key: StepKey;
  label: string;
  icon: LucideIcon;
  pregunta: string;
  emoji: string;
  chip: string;
  items: ArmadorItem[];
}

interface ArmadorViewProps {
  destino: { slug: string; nombre: string };
  hospedajes: ArmadorItem[];
  gastronomia: ArmadorItem[];
  atractivos: ArmadorItem[];
}

export function ArmadorView({
  destino,
  hospedajes,
  gastronomia,
  atractivos,
}: ArmadorViewProps) {
  // Solo se muestran los pasos con inventario.
  const steps = React.useMemo<StepDef[]>(() => {
    const all: StepDef[] = [
      {
        key: "hospedaje",
        label: "Dónde dormir",
        icon: BedDouble,
        pregunta: "¿Dónde te quedás?",
        emoji: "🏠",
        chip: "bg-primary/90",
        items: hospedajes,
      },
      {
        key: "gastronomia",
        label: "Para comer",
        icon: UtensilsCrossed,
        pregunta: "¿Dónde comés o desayunás?",
        emoji: "🍽️",
        chip: "bg-rose-500/90",
        items: gastronomia,
      },
      {
        key: "atractivo",
        label: "Para hacer",
        icon: Compass,
        pregunta: "¿Qué hacés mientras estás?",
        emoji: "🌅",
        chip: "bg-amber-500/90",
        items: atractivos,
      },
    ];
    return all.filter((s) => s.items.length > 0);
  }, [hospedajes, gastronomia, atractivos]);

  const [sel, setSel] = React.useState<Record<StepKey, string | null>>({
    hospedaje: null,
    gastronomia: null,
    atractivo: null,
  });
  const stepRefs = React.useRef<Array<HTMLElement | null>>([]);

  const completedCount = steps.filter((s) => sel[s.key]).length;
  const allDone = completedCount === steps.length && steps.length > 0;

  function pick(key: StepKey, slug: string) {
    setSel((prev) => ({ ...prev, [key]: prev[key] === slug ? null : slug }));
    // Scroll suave al próximo paso vacío.
    const idx = steps.findIndex((s) => s.key === key);
    if (idx >= 0 && idx < steps.length - 1) {
      window.setTimeout(() => {
        stepRefs.current[idx + 1]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 220);
    }
  }

  function scrollToNextEmpty() {
    const idx = steps.findIndex((s) => !sel[s.key]);
    if (idx >= 0) {
      stepRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Item elegido por paso (para resumen y mensaje).
  const chosenItems = steps
    .map((s) => ({ step: s, item: s.items.find((i) => i.slug === sel[s.key]) }))
    .filter((x): x is { step: StepDef; item: ArmadorItem } => Boolean(x.item));

  // WhatsApp: ancla = hospedaje elegido → fallback 1er elegido con whatsapp.
  const waTarget =
    chosenItems.find((c) => c.step.key === "hospedaje" && c.item.whatsapp)?.item ??
    chosenItems.find((c) => c.item.whatsapp)?.item ??
    null;

  const canSend = chosenItems.length >= 1 && Boolean(waTarget?.whatsapp);

  const waUrl = React.useMemo(() => {
    if (!waTarget?.whatsapp) return null;
    const lines = [
      `Hola! Armé una escapada en ${destino.nombre} desde Mis Escapadas:`,
      ...chosenItems.map((c) => `${c.step.emoji} ${c.item.nombre}`),
      "",
      "¿Coordinamos?",
    ];
    return buildWhatsAppUrl({ whatsapp: waTarget.whatsapp, mensaje: lines.join("\n") });
  }, [waTarget, chosenItems, destino.nombre]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container flex items-center gap-3 py-3">
          <Link
            href={`/${destino.slug}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Volver al destino</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="eyebrow flex items-center gap-1.5">
              <WandSparkles className="h-3.5 w-3.5" aria-hidden />
              Armá tu escapada
            </p>
            <h1 className="truncate font-display text-lg tracking-tight text-foreground sm:text-xl">
              {destino.nombre}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" aria-label="Progreso">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={
                  "h-2 w-2 rounded-full transition " +
                  (sel[s.key]
                    ? "bg-primary"
                    : "bg-border")
                }
              />
            ))}
          </div>
        </div>
      </header>

      <main className="container space-y-10 py-8">
        <p className="max-w-xl text-muted-foreground">
          Elegí lo que más te guste de {destino.nombre} y te lo dejamos listo para
          coordinar en un solo mensaje. Sin reservas online: hablás directo con el
          hospedaje.
        </p>

        {steps.map((step, idx) => {
          const chosen = sel[step.key];
          const Icon = step.icon;
          return (
            <section
              key={step.key}
              ref={(el) => {
                stepRefs.current[idx] = el;
              }}
              aria-labelledby={`step-${step.key}`}
              className="scroll-mt-24"
            >
              <header className="mb-4 flex items-center gap-3">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${step.chip}`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Paso {idx + 1} de {steps.length}
                  </p>
                  <h2
                    id={`step-${step.key}`}
                    className="font-display text-xl tracking-tight text-foreground"
                  >
                    {step.pregunta}
                  </h2>
                </div>
                {chosen && (
                  <button
                    type="button"
                    onClick={() => setSel((p) => ({ ...p, [step.key]: null }))}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Cambiar
                  </button>
                )}
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                {step.items.map((item) => {
                  const isPicked = chosen === item.slug;
                  const isOther = Boolean(chosen) && !isPicked;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => pick(step.key, item.slug)}
                      aria-pressed={isPicked}
                      className={
                        "group flex gap-3 rounded-2xl border bg-card p-3 text-left transition " +
                        (isPicked
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:shadow-sm") +
                        (isOther ? " opacity-55" : "")
                      }
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                        {item.fotoUrl ? (
                          <Image
                            src={item.fotoUrl}
                            alt={item.nombre}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Icon className="h-7 w-7" aria-hidden />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium leading-tight text-foreground">
                            {item.nombre}
                          </h3>
                          {isPicked && (
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                              aria-label="Seleccionado"
                            >
                              <Check className="h-3 w-3" aria-hidden />
                            </span>
                          )}
                        </div>
                        {item.sublabel && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.sublabel}
                          </p>
                        )}
                        {item.descripcion && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.descripcion}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Footer sticky */}
      <aside
        aria-live="polite"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      >
        <div className="container flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            {allDone ? (
              <>
                <p className="font-medium text-foreground">Tu escapada está lista</p>
                <p className="truncate text-xs text-muted-foreground">
                  {chosenItems.map((c) => c.item.nombre).join(" · ")}
                </p>
              </>
            ) : (
              <>
                <div className="mb-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full bg-primary transition-all"
                    style={{ width: `${(completedCount / steps.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-foreground">
                  <strong>
                    {completedCount} de {steps.length} seleccionados
                  </strong>
                </p>
              </>
            )}
          </div>

          {!allDone && completedCount < steps.length && (
            <button
              type="button"
              onClick={scrollToNextEmpty}
              className="hidden shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary sm:inline-flex"
            >
              Seguir armando
              <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
          )}

          {canSend && waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Coordinar por WhatsApp
            </a>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-muted-foreground">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Elegí al menos un lugar
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}
