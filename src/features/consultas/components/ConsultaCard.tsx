"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Calendar,
  Users,
  ExternalLink,
  CheckCircle2,
  Inbox,
  Trash2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  updateConsultaEstadoAction,
  deleteConsultaAction,
} from "@/features/consultas/lib/admin-actions";
import { updateConsultaEstadoResponsableAction } from "@/features/consultas/lib/responsable-actions";
import type { EstadoConsulta } from "@/types/database";
import type { ConsultaListRow } from "@/features/consultas/lib/queries";
import { cn } from "@/lib/utils";

interface Props {
  consulta: ConsultaListRow;
  /**
   * Define qué server actions usa la card y qué botones muestra:
   * - "admin": usa admin-actions, muestra "Borrar" (purga definitiva), link
   *   al hospedaje en /admin/hospedajes.
   * - "responsable": usa responsable-actions, sin borrar, link al hospedaje
   *   en /panel/hospedajes.
   */
  mode?: "admin" | "responsable";
}

const ESTADO_STYLES: Record<EstadoConsulta, string> = {
  nueva: "bg-amber-100 text-amber-900 border-amber-200",
  leida: "bg-blue-100 text-blue-900 border-blue-200",
  respondida: "bg-emerald-100 text-emerald-900 border-emerald-200",
  descartada: "bg-slate-100 text-slate-700 border-slate-200",
};

const ESTADO_LABEL: Record<EstadoConsulta, string> = {
  nueva: "Nueva",
  leida: "Leída",
  respondida: "Respondida",
  descartada: "Descartada",
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConsultaCard({ consulta, mode = "admin" }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoConsulta>(consulta.estado);

  function cambiarEstado(nuevo: EstadoConsulta) {
    setError(null);
    startTransition(async () => {
      const updateAction =
        mode === "responsable"
          ? updateConsultaEstadoResponsableAction
          : updateConsultaEstadoAction;
      const res = await updateAction({
        consultaId: consulta.id,
        estado: nuevo,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEstado(nuevo);
    });
  }

  function borrar() {
    const ok = window.confirm(
      "¿Borrar la consulta para siempre? Esta acción es para spam — para casos normales usá 'Descartar'."
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteConsultaAction(consulta.id);
      if (res.error) {
        setError(res.error);
      }
      // El revalidate del action recarga el listado y este card desaparece.
    });
  }

  const mailtoSubject = encodeURIComponent(
    `Re: tu consulta sobre ${consulta.hospedaje_nombre}`
  );
  const waNumber = consulta.whatsapp?.replace(/[^0-9]/g, "") ?? null;

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition",
        estado === "descartada" && "opacity-60"
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-semibold",
                ESTADO_STYLES[estado]
              )}
            >
              {ESTADO_LABEL[estado]}
            </span>
            <Link
              href={
                mode === "responsable"
                  ? `/panel/hospedajes/${consulta.hospedaje_id}`
                  : `/admin/hospedajes/${consulta.hospedaje_id}`
              }
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              → {consulta.hospedaje_nombre}
            </Link>
          </div>
          <h3 className="mt-2 font-display text-lg tracking-tight">
            {consulta.nombre}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Recibida {formatDateTime(consulta.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={`mailto:${consulta.email}?subject=${mailtoSubject}`}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium transition hover:bg-secondary"
            title={`Mandar mail a ${consulta.email}`}
          >
            <Mail className="h-3.5 w-3.5" />
            Mail
          </a>
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
              title={`WhatsApp a ${consulta.whatsapp}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          <Link
            href={`/${consulta.destino_slug}/hospedajes/${consulta.hospedaje_slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
            title="Ver hospedaje público"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <dt className="sr-only">Fechas</dt>
            <dd>
              {formatDate(consulta.check_in)} → {formatDate(consulta.check_out)}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <dt className="sr-only">Huéspedes</dt>
            <dd>
              {consulta.cantidad_huespedes}{" "}
              {consulta.cantidad_huespedes === 1 ? "huésped" : "huéspedes"}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{consulta.email}</span>
        </div>
      </dl>

      <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-foreground whitespace-pre-line">
        {consulta.mensaje}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-800">
          {error}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {estado === "nueva" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => cambiarEstado("leida")}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium transition hover:bg-secondary disabled:opacity-50"
          >
            <Inbox className="h-3.5 w-3.5" />
            Marcar leída
          </button>
        )}
        {estado !== "respondida" && estado !== "descartada" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => cambiarEstado("respondida")}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marcar respondida
          </button>
        )}
        {estado !== "descartada" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => cambiarEstado("descartada")}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5" />
            Descartar
          </button>
        )}
        {(estado === "respondida" || estado === "descartada") && (
          <button
            type="button"
            disabled={pending}
            onClick={() => cambiarEstado("nueva")}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Volver a nueva
          </button>
        )}
        <span className="flex-1" />
        {mode === "admin" && (
          <button
            type="button"
            disabled={pending}
            onClick={borrar}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
            title="Borrar definitivo (para spam)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Borrar
          </button>
        )}
      </footer>
    </article>
  );
}
