"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  deleteAdminAction,
  type AdminListRow,
} from "@/features/admin/lib/admin-management";

interface Props {
  admins: AdminListRow[];
  currentUserId: string;
}

export function AdminsList({ admins, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(row: AdminListRow) {
    const confirmed = window.confirm(
      `¿Borrar admin ${row.nombre ?? row.email}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAdminAction(row.id);
      if (res.error) setError(res.error);
    });
  }

  if (admins.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay admins cargados.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Nombre</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Scope</th>
            <th className="px-4 py-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((a) => {
            const isMe = a.id === currentUserId;
            return (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-medium">{a.nombre ?? "—"}</span>
                  {isMe && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                <td className="px-4 py-3">
                  {a.destinoId === null ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Super admin
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {a.destinoNombre ?? "(destino)"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Borrar
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
