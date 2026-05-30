"use client";

import Image from "next/image";
import {
  Building2,
  Utensils,
  Sparkles,
  MessageCircle,
  ArrowRight,
  Check,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ComboPublic } from "@/features/combos/lib/queries";
import type { ComercioTipo } from "@/types/database";

export const COMBO_CHIP: Record<
  ComercioTipo,
  { label: string; icon: LucideIcon; cls: string }
> = {
  hospedaje: { label: "Dónde dormir", icon: Building2, cls: "bg-primary/90" },
  gastronomico: { label: "Para comer", icon: Utensils, cls: "bg-rose-500/90" },
  atractivo: { label: "Para hacer", icon: Sparkles, cls: "bg-amber-500/90" },
};

export function ComboCard({
  combo,
  onOpen,
}: {
  combo: ComboPublic;
  onOpen: (c: ComboPublic) => void;
}) {
  const waUrl = combo.whatsapp
    ? buildWhatsAppUrl({
        whatsapp: combo.whatsapp.numero,
        mensaje: `Hola, vi el combo "${combo.titulo}" en Mis Escapadas y quería consultar.`,
      })
    : null;

  return (
    <article
      onClick={() => onOpen(combo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(combo);
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {combo.heroUrl ? (
          <Image
            src={combo.heroUrl}
            alt={combo.titulo}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Sparkles size={40} aria-hidden />
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Sparkles className="h-3 w-3" aria-hidden />
          Solo en Mis Escapadas
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {combo.items.map((it, i) => {
            const def = COMBO_CHIP[it.tipo];
            const Icon = def.icon;
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${def.cls}`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {def.label}
              </span>
            );
          })}
        </div>

        <h3 className="mt-3 font-display text-2xl tracking-tight text-foreground">
          {combo.titulo}
        </h3>
        {combo.bajada && (
          <p className="mt-1 text-sm text-muted-foreground">{combo.bajada}</p>
        )}

        <ul className="mt-4 space-y-2">
          {combo.items.map((it, i) => {
            const def = COMBO_CHIP[it.tipo];
            const Icon = def.icon;
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${def.cls}`}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                </span>
                <span className="text-foreground">
                  <span className="font-medium">{it.nombre}</span> — {it.beneficio}
                </span>
              </li>
            );
          })}
        </ul>

        {combo.beneficios.length > 0 && (
          <div className="mt-4 rounded-lg bg-secondary/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Beneficios cruzados
            </p>
            <ul className="mt-1.5 space-y-1">
              {combo.beneficios.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto pt-5">
          {combo.precioDesde != null && (
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">Desde</span>
              <span className="font-display text-2xl tracking-tight text-foreground">
                ${combo.precioDesde.toLocaleString("es-AR")}
              </span>
              <span className="text-xs text-muted-foreground">
                por {combo.noches} {combo.noches === 1 ? "noche" : "noches"}
              </span>
              {combo.ahorroPct && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Ahorro {combo.ahorroPct}%
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Consultar
              </a>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(combo);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Ver detalle
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {combo.validez && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarCheck className="h-3 w-3" aria-hidden />
              {combo.validez}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
