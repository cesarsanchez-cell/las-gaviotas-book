"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import {
  deleteAtraccionAction,
  togglePublicadaAction,
  type AtraccionListRow,
} from "@/features/admin/lib/atraccion-management";
import { cn } from "@/lib/utils";

export function AtraccionesList({
  atracciones,
}: {
  atracciones: AtraccionListRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(a: AtraccionListRow) {
    setError(null);
    startTransition(async () => {
      const res = await togglePublicadaAction(a.id);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete(a: AtraccionListRow) {
    if (!window.confirm(`¿Borrar la atracción "${a.nombre}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAtraccionAction(a.id);
      if (res.error) setError(res.error);
    });
  }

  if (atracciones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay atracciones. Creá una y colgala de una zona (playa,
        bosque, un evento en el anfiteatro…).
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
              <th className="px-2 py-2 text-left font-medium sm:px-4">Atracción</th>
              <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Zona</th>
              <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Ancla</th>
              <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Vigencia</th>
              <th className="px-2 py-2 text-center font-medium sm:px-4">Estado</th>
              <th className="px-2 py-2 text-right font-medium sm:px-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {atracciones.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-2 py-3 sm:px-4">
                  <span className="font-medium text-xs sm:text-sm">{a.nombre}</span>
                  <div className="text-xs text-muted-foreground">
                    {a.categoria ? `${a.categoria} · ` : ""}
                    <code>{a.slug}</code>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {a.zonaNombre ?? "—"}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {a.destinoAnclaNombre ?? "Toda la zona"}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {a.vigenciaLabel}
                </td>
                <td className="px-2 py-3 text-center sm:px-4">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      a.publicada
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {a.publicada ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="px-2 py-3 text-right sm:px-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(a)}
                      disabled={pending}
                      title={a.publicada ? "Despublicar" : "Publicar"}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary disabled:opacity-50 sm:px-2"
                    >
                      {a.publicada ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <Link
                      href={`/admin/atracciones/${a.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1 text-xs transition hover:bg-secondary sm:px-2"
                      title="Editar"
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="hidden sm:inline">Editar</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      disabled={pending}
                      title="Borrar"
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-1.5 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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
