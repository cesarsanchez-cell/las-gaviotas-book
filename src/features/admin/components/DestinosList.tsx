"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, ExternalLink, Power } from "lucide-react";
import {
  deleteDestinoAction,
  toggleDestinoActivoAction,
  type DestinoListRow,
} from "@/features/admin/lib/destino-management";
import { cn } from "@/lib/utils";

interface Props {
  destinos: DestinoListRow[];
  canEdit: boolean;
}

export function DestinosList({ destinos, canEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(d: DestinoListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleDestinoActivoAction(d.id);
      if (res.error) setError(res.error);
    });
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
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Destino</th>
              <th className="px-4 py-2 text-left font-medium">Ubicación</th>
              <th className="px-4 py-2 text-right font-medium">Hospedajes</th>
              <th className="px-4 py-2 text-center font-medium">Orden</th>
              <th className="px-4 py-2 text-center font-medium">Activo</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {destinos.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{d.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    <code>/{d.slug}</code>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[d.region, d.provincia, d.pais].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-right">{d.hospedajesCount}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {d.orden}
                </td>
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link
                      href={`/${d.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
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
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/destinos/${d.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
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
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
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
