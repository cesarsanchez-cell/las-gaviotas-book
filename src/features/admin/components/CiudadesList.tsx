"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, Power } from "lucide-react";
import {
  deleteCiudadAction,
  toggleCiudadActivaAction,
  type CiudadListRow,
} from "@/features/admin/lib/ciudad-management";
import { cn } from "@/lib/utils";

interface Props {
  ciudades: CiudadListRow[];
  canEdit: boolean;
}

export function CiudadesList({ ciudades, canEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(c: CiudadListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleCiudadActivaAction(c.id);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete(c: CiudadListRow) {
    const extra =
      c.destinosCount > 0
        ? ` Sus ${c.destinosCount} destino${c.destinosCount === 1 ? "" : "s"} quedarán sin ciudad.`
        : "";
    const ok = window.confirm(
      `¿Borrar la ciudad "${c.nombre}"?${extra} Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCiudadAction(c.id);
      if (res.error) setError(res.error);
    });
  }

  if (ciudades.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay ciudades cargadas. Creá una para agrupar destinos
        cercanos (ej. Villa Gesell → Las Gaviotas, Mar Azul…).
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
              <th className="px-2 py-2 text-left font-medium sm:px-4">Ciudad</th>
              <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Región</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">CP</th>
              <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Destinos</th>
              <th className="px-2 py-2 text-center font-medium sm:px-4">Estado</th>
              <th className="px-2 py-2 text-right font-medium sm:px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ciudades.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-2 py-3 sm:px-4">
                  <span className="font-medium text-xs sm:text-sm">{c.nombre}</span>
                  <div className="text-xs text-muted-foreground">
                    <code>{c.slug}</code>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {c.regionNombre ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {c.codigoPostal ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-right md:table-cell">{c.destinosCount}</td>
                <td className="px-2 py-3 text-center sm:px-4">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {c.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-2 py-3 text-right sm:px-4">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(c)}
                          disabled={pending}
                          title={c.activo ? "Desactivar" : "Activar"}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50 sm:px-2"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/ciudades/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary sm:px-2"
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Editar</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={pending}
                          title="Borrar"
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
