"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, ExternalLink, Power, SlidersHorizontal } from "lucide-react";
import {
  deleteDestinoAction,
  toggleDestinoActivoAction,
  toggleRestriccionesHabilitadasAction,
  type DestinoListRow,
} from "@/features/admin/lib/destino-management";
import { cn } from "@/lib/utils";

interface Props {
  destinos: DestinoListRow[];
  canEdit: boolean;
  /** True si el admin logueado es super admin (puede togglear cualquier destino). */
  isSuperAdmin: boolean;
  /** Destino del admin local (null para super admin). Habilita el toggle de restricciones sobre su propio destino. */
  currentDestinoId: string | null;
}

export function DestinosList({
  destinos,
  canEdit,
  isSuperAdmin,
  currentDestinoId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(d: DestinoListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleDestinoActivoAction(d.id);
      if (res.error) setError(res.error);
    });
  }

  function handleToggleRestricciones(d: DestinoListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleRestriccionesHabilitadasAction(d.id);
      if (res.error) setError(res.error);
    });
  }

  function canToggleRestricciones(d: DestinoListRow): boolean {
    return isSuperAdmin || currentDestinoId === d.id;
  }

  function handleDelete(d: DestinoListRow) {
    if (d.hospedajesCount > 0) {
      setError(
        `No se puede borrar "${d.nombre}": tiene ${d.hospedajesCount} hospedaje${d.hospedajesCount === 1 ? "" : "s"} asignado${d.hospedajesCount === 1 ? "" : "s"}. Marcalo como inactivo o migrá los hospedajes primero.`
      );
      return;
    }
    const ok = window.confirm(
      `¿Borrar destino "${d.nombre}" definitivamente? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDestinoAction(d.id);
      if (res.error) setError(res.error);
    });
  }

  if (destinos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay destinos cargados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left font-medium sm:px-4">Destino</th>
              <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Ubicación</th>
              <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Hospedajes</th>
              <th className="hidden px-4 py-2 text-center font-medium md:table-cell">Orden</th>
              <th className="px-2 py-2 text-center font-medium sm:px-4">Activo</th>
              <th className="hidden px-4 py-2 text-center font-medium lg:table-cell">Restricciones</th>
              <th className="px-2 py-2 text-right font-medium sm:px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {destinos.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-2 py-2 sm:px-4 sm:py-3">
                  <div className="font-medium text-xs sm:text-sm">{d.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    <code>/{d.slug}</code>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {[d.region, d.provincia, d.pais].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="hidden px-4 py-3 text-right sm:table-cell">{d.hospedajesCount}</td>
                <td className="hidden px-4 py-3 text-center text-muted-foreground md:table-cell">
                  {d.orden}
                </td>
                <td className="px-2 py-2 text-center sm:px-4 sm:py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      d.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {d.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-center lg:table-cell">
                  {canToggleRestricciones(d) ? (
                    <button
                      type="button"
                      onClick={() => handleToggleRestricciones(d)}
                      disabled={pending}
                      title={
                        d.restricciones_habilitadas
                          ? "Restricciones activadas — clic para desactivar"
                          : "Restricciones desactivadas — clic para activar"
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition disabled:opacity-50",
                        d.restricciones_habilitadas
                          ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      <span className="hidden sm:inline">
                        {d.restricciones_habilitadas ? "Activadas" : "Desactivadas"}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        d.restricciones_habilitadas
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <span className="hidden sm:inline">
                        {d.restricciones_habilitadas ? "Activadas" : "Desactivadas"}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right sm:px-4 sm:py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/${d.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs text-muted-foreground transition hover:text-foreground sm:px-2"
                      title="Ver público"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(d)}
                          disabled={pending}
                          title={d.activo ? "Desactivar" : "Activar"}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50 sm:px-2"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/destinos/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary sm:px-2"
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Editar</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          disabled={pending || d.hospedajesCount > 0}
                          title={
                            d.hospedajesCount > 0
                              ? "Tiene hospedajes — no se puede borrar"
                              : "Borrar"
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-1.5 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:px-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
