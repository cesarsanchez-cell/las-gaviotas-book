"use client";

import { useState, useTransition } from "react";
import { Trash2, Building2, Pencil, X, Check } from "lucide-react";
import {
  deleteResponsableAction,
  updateResponsableHospedajesAction,
  type ResponsableListRow,
  type HospedajeOption,
} from "@/features/admin/lib/responsable-management";

interface Props {
  responsables: ResponsableListRow[];
  hospedajesDisponibles: HospedajeOption[];
}

export function ResponsablesList({ responsables, hospedajesDisponibles }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSelected, setEditSelected] = useState<string[]>([]);

  function handleDelete(row: ResponsableListRow) {
    const ok = window.confirm(
      `¿Borrar al responsable ${row.nombre ?? row.email}? Sus hospedajes asignados quedan sin responsable (volvés a recibir las consultas vos como admin).`
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteResponsableAction(row.id);
      if (res.error) setError(res.error);
    });
  }

  function startEdit(row: ResponsableListRow) {
    setEditingId(row.id);
    setEditSelected(row.hospedajes.map((h) => h.id));
    setError(null);
  }

  function toggleEdit(id: string) {
    setEditSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function saveEdit(row: ResponsableListRow) {
    setError(null);
    startTransition(async () => {
      const res = await updateResponsableHospedajesAction({
        responsableId: row.id,
        hospedajeIds: editSelected,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditingId(null);
    });
  }

  if (responsables.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay responsables cargados todavía.
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
      {responsables.map((r) => {
        const isEditing = editingId === r.id;
        return (
          <article
            key={r.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg tracking-tight">
                  {r.nombre ?? "—"}
                </h3>
                <p className="text-sm text-muted-foreground">{r.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar hospedajes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Borrar
                </button>
              </div>
            </header>

            {isEditing ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Tildá los hospedajes que querés que este responsable gestione.
                </p>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-3">
                  {hospedajesDisponibles.map((h) => (
                    <label
                      key={h.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={editSelected.includes(h.id)}
                        onChange={() => toggleEdit(h.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span className="flex-1">{h.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {h.destinoNombre}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveEdit(r)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" />
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs transition hover:bg-secondary disabled:opacity-50"
                  >
                    <X className="h-3 w-3" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                {r.hospedajes.length === 0 ? (
                  <span className="text-muted-foreground">
                    Sin hospedajes asignados
                  </span>
                ) : (
                  r.hospedajes.map((h) => (
                    <span
                      key={h.id}
                      className="rounded-full bg-muted px-2 py-0.5"
                    >
                      {h.nombre}
                    </span>
                  ))
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
