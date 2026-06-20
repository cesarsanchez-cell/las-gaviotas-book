"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, Power } from "lucide-react";
import {
  deleteZonaAction,
  toggleZonaActivaAction,
  type ZonaListRow,
} from "@/features/admin/lib/zona-management";
import { cn } from "@/lib/utils";

interface Props {
  zonas: ZonaListRow[];
  canEdit: boolean;
}

export function ZonasList({ zonas, canEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(z: ZonaListRow) {
    setError(null);
    startTransition(async () => {
      const res = await toggleZonaActivaAction(z.id);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete(z: ZonaListRow) {
    const extra =
      z.atraccionesCount > 0
        ? ` Se borrarán también sus ${z.atraccionesCount} atracción${z.atraccionesCount === 1 ? "" : "es"}.`
        : "";
    const ok = window.confirm(
      `¿Borrar la zona "${z.nombre}"?${extra} Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteZonaAction(z.id);
      if (res.error) setError(res.error);
    });
  }

  if (zonas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay zonas. Creá una para agrupar destinos de un conglomerado
        (ej. Pueblos del bosque → Las Gaviotas, Mar Azul, Mar de las Pampas) y
        después colgale atracciones.
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
              <th className="px-4 py-2 text-left font-medium">Zona</th>
              <th className="px-4 py-2 text-left font-medium">Ciudad</th>
              <th className="px-4 py-2 text-left font-medium">Curador</th>
              <th className="px-4 py-2 text-right font-medium">Destinos</th>
              <th className="px-4 py-2 text-right font-medium">Atracciones</th>
              <th className="px-4 py-2 text-center font-medium">Estado</th>
              <th className="px-4 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-medium">{z.nombre}</span>
                  <div className="text-xs text-muted-foreground">
                    <code>{z.slug}</code>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {z.ciudadNombre ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {z.curadorNombre ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">{z.destinosCount}</td>
                <td className="px-4 py-3 text-right">{z.atraccionesCount}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      z.activo
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {z.activo ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(z)}
                          disabled={pending}
                          title={z.activo ? "Desactivar" : "Activar"}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <Link
                          href={`/admin/zonas/${z.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(z)}
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
