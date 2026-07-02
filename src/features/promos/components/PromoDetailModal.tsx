"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, MapPin, Tag, Check, ArrowRight, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { PromoPublic } from "@/features/promos/lib/queries";
import type { ComercioTipo } from "@/types/database";

// Mapea el tipo de comercio al segmento de ruta de su ficha pública.
const TIPO_SEGMENT: Record<ComercioTipo, string> = {
  hospedaje: "hospedajes",
  gastronomico: "gastronomia",
  atractivo: "atractivos",
};

/**
 * Modal de detalle de una promo individual (un comercio). Mismo lenguaje visual
 * que ComboDetailModal: hero con foto heredada del comercio + cuerpo con el
 * beneficio y CTA a la ficha del comercio (ahí vive la consulta por WhatsApp).
 */
export function PromoDetailModal({
  promo,
  onClose,
}: {
  promo: PromoPublic;
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

  const fichaUrl = `/${promo.destino.slug}/${TIPO_SEGMENT[promo.comercio.tipo]}/${promo.comercio.slug}`;

  const waUrl = promo.comercio.whatsapp
    ? buildWhatsAppUrl({
        whatsapp: promo.comercio.whatsapp,
        mensaje: `Hola, vi la promo "${promo.titulo}" de ${promo.comercio.nombre} en Mis Escapadas y quería consultar.`,
      })
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promo.titulo}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm md:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-xl"
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
          {promo.comercio.fotoUrl ? (
            <Image
              src={promo.comercio.fotoUrl}
              alt={promo.comercio.nombre}
              fill
              sizes="640px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Tag size={44} aria-hidden />
            </div>
          )}
          {promo.pct && (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground shadow">
              -{promo.pct}%
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-white/80">
              <MapPin className="h-3 w-3" aria-hidden />
              {promo.comercio.nombre} · {promo.destino.nombre}
            </p>
            <h2 className="mt-1 font-display text-3xl tracking-tight drop-shadow">
              {promo.titulo}
            </h2>
            {promo.bajada && (
              <p className="mt-1 max-w-lg text-sm text-white/85">{promo.bajada}</p>
            )}
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <section className="rounded-xl bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              El beneficio
            </p>
            <p className="mt-2 inline-flex items-start gap-2 text-base text-foreground">
              <Check className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              {promo.beneficio}
            </p>
          </section>

          <section className="flex flex-wrap gap-3 border-t border-border pt-5">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Consultar por WhatsApp
              </a>
            )}
            <Link
              href={fichaUrl}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Ver {promo.comercio.nombre}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
