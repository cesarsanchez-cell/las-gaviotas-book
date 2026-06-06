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
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Ciudad</th>
              <th className="px-4 py-2 text-left font-medium">Región</th>
              <th className="px-4 py-2 text-left font-medium">CP</th>
              <th className="px-4 py-2 text-right font-medium">Destinos</th>
              <th className="px-4 py-2 text-center font-medium">Estado</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ciudades.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-medium">{c.nombre}</span>
                  <div className="text-xs text-muted-foreground">
                    <code>{c.slug}</code>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.regionNombre ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.codigoPostal ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">{c.destinosCount}</td>
                <td className="px-4 py-3 text-center">
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
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(c)}
                          disabled={pending}
                          title={c.activo ? "Desactivar" : "Activar"}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/ciudades/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={pending}
                          title="Borrar"
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
