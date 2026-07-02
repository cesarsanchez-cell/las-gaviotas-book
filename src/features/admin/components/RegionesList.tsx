"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, Power, Star } from "lucide-react";
import {
  deleteRegionAction,
  toggleRegionActivaAction,
  type RegionListRow,
} from "@/features/admin/lib/region-management";
import { cn } from "@/lib/utils";

interface Props {
  regiones: RegionListRow[];
  canEdit: boolean;
}

export function RegionesList({ regiones, canEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(r: RegionListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleRegionActivaAction(r.id);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete(r: RegionListRow) {
    if (r.destinosCount > 0) {
      setError(
        `No se puede borrar "${r.nombre}": tiene ${r.destinosCount} destino${r.destinosCount === 1 ? "" : "s"} asignado${r.destinosCount === 1 ? "" : "s"}. Migralos primero o marcala como inactiva.`
      );
      return;
    }
    const ok = window.confirm(
      `¿Borrar región "${r.nombre}" definitivamente? Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteRegionAction(r.id);
      if (res.error) setError(res.error);
    });
  }

  if (regiones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay regiones cargadas.
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
              <th className="px-2 py-2 text-left font-medium sm:px-4">Región</th>
              <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Biomas</th>
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Destinos</th>
              <th className="hidden px-4 py-2 text-center font-medium lg:table-cell">Orden</th>
              <th className="px-2 py-2 text-center font-medium sm:px-4">Estado</th>
              <th className="px-2 py-2 text-right font-medium sm:px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {regiones.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-3 sm:px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs sm:text-sm">{r.nombre}</span>
                    {r.destacado && (
                      <Star
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                        aria-label="Destacada"
                      />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <code>/regiones/{r.slug}</code>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {r.biomas.map((b) => (
                      <span
                        key={b}
                        className="bioma-chip"
                        data-bioma={b}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-right md:table-cell">{r.destinosCount}</td>
                <td className="hidden px-4 py-3 text-center text-muted-foreground lg:table-cell">
                  {r.orden}
                </td>
                <td className="px-2 py-3 text-center sm:px-4">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      r.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {r.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-2 py-3 text-right sm:px-4">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(r)}
                          disabled={pending}
                          title={r.activo ? "Desactivar" : "Activar"}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50 sm:px-2"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/regiones/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary sm:px-2"
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Editar</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(r)}
                          disabled={pending || r.destinosCount > 0}
                          title={
                            r.destinosCount > 0
                              ? "Tiene destinos — no se puede borrar"
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
