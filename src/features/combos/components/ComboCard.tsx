"use client";

import Image from "next/image";
import { Building2, Utensils, Sparkles, type LucideIcon } from "lucide-react";
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

/**
 * Card compacta de combo para el carrusel de la home: mismo tamaño que las cards
 * de los verticales (ItemCard). Es un teaser — el detalle completo (items,
 * beneficios cruzados, precio, WhatsApp) vive en ComboDetailModal, que abre al
 * clickear. El ancho lo fija el contenedor del carrusel.
 */
export function ComboCard({
  combo,
  onOpen,
}: {
  combo: ComboPublic;
  onOpen: (c: ComboPublic) => void;
}) {
  return (
    <article
      onClick={() => onOpen(combo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(combo);
      }}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {combo.heroUrl ? (
          <Image
            src={combo.heroUrl}
            alt={combo.titulo}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Sparkles size={40} aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Sparkles className="h-3 w-3" aria-hidden />
          Solo acá
        </span>
        {combo.ahorroPct && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
            -{combo.ahorroPct}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        {/* Mezcla del combo: un dot por tipo (dormir/comer/hacer). El detalle va al modal. */}
        <div className="flex flex-wrap gap-1">
          {combo.items.map((it, i) => {
            const def = COMBO_CHIP[it.tipo];
            const Icon = def.icon;
            return (
              <span
                key={i}
                title={def.label}
                aria-label={def.label}
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-white ${def.cls}`}
              >
                <Icon className="h-3 w-3" aria-hidden />
              </span>
            );
          })}
        </div>

        <h3 className="mt-1.5 font-display text-base leading-tight tracking-tight text-foreground">
          {combo.titulo}
        </h3>

        {combo.precioDesde != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Desde{" "}
            <span className="font-semibold text-foreground">
              ${combo.precioDesde.toLocaleString("es-AR")}
            </span>
            {combo.noches
              ? ` · ${combo.noches} ${combo.noches === 1 ? "noche" : "noches"}`
              : ""}
          </p>
        )}
      </div>
    </article>
  );
}
