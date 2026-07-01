"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  MapPin,
  Check,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { COMBO_CHIP } from "./ComboCard";
import type { ComboPublic } from "@/features/combos/lib/queries";

export function ComboDetailModal({
  combo,
  onClose,
}: {
  combo: ComboPublic;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const waUrl = combo.whatsapp
    ? buildWhatsAppUrl({
        whatsapp: combo.whatsapp.numero,
        mensaje: `Hola, vi el combo "${combo.titulo}" en Mis Escapadas y quería consultar.`,
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={combo.titulo}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-0 backdrop-blur-sm sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl overflow-hidden bg-background shadow-xl sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>

        <div className="relative aspect-[16/9] bg-secondary">
          {combo.heroUrl && (
            <Image src={combo.heroUrl} alt={combo.titulo} fill sizes="640px" className="object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-white/80">
              <MapPin className="h-3 w-3" aria-hidden />
              {combo.destinoNombre}
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-tight drop-shadow">
              {combo.titulo}
            </h2>
            {combo.bajada && (
              <p className="mt-1 max-w-lg text-sm text-white/85">{combo.bajada}</p>
            )}
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Lo que incluye
            </p>
            <div className="mt-3 space-y-3">
              {combo.items.map((it, i) => {
                const def = COMBO_CHIP[it.tipo];
                const Icon = def.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {it.fotoUrl ? (
                        <Image src={it.fotoUrl} alt={it.nombre} fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white ${def.cls}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {def.label}
                      </span>
                      <h4 className="mt-1 font-medium text-foreground">{it.nombre}</h4>
                      {it.descripcionCorta && (
                        <p className="text-xs text-muted-foreground">{it.descripcionCorta}</p>
                      )}
                      <p className="mt-1 inline-flex items-start gap-1 text-sm text-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                        {it.beneficio}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {combo.beneficios.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Beneficios cruzados
              </p>
              <ul className="mt-2 space-y-1.5">
                {combo.beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Sparkle />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <div>
              {combo.precioDesde != null && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-muted-foreground">Desde</span>
                  <span className="font-display text-3xl tracking-tight text-foreground">
                    ${combo.precioDesde.toLocaleString("es-AR")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    por {combo.noches} {combo.noches === 1 ? "noche" : "noches"}
                  </span>
                </div>
              )}
              {combo.ahorroPct && (
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Ahorro {combo.ahorroPct}%
                </span>
              )}
            </div>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Consultar por WhatsApp
              </a>
            )}
          </section>

          {combo.validez && (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarCheck className="h-3 w-3" aria-hidden />
              {combo.validez}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
      <Check className="h-2.5 w-2.5" aria-hidden />
    </span>
  );
}
