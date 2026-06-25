"use client";

import { useState, useTransition } from "react";
import {
  Trash2,
  Building2,
  UtensilsCrossed,
  Compass,
  Pencil,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  deleteResponsableAction,
  updateResponsableAction,
  type ResponsableListRow,
  type EntidadAsignable,
} from "@/features/admin/lib/responsable-management";

interface Props {
  responsables: ResponsableListRow[];
  /** Entidades libres (sin responsable asignado) que el admin puede asignar al editar. */
  entidadesDisponibles: EntidadAsignable[];
}

type EntidadKey = `${EntidadAsignable["tipo"]}:${string}`;
function keyOf(e: { tipo: EntidadAsignable["tipo"]; id: string }): EntidadKey {
  return `${e.tipo}:${e.id}`;
}

export function ResponsablesList({ responsables, entidadesDisponibles }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState<string>("");
  const [editSelected, setEditSelected] = useState<Set<EntidadKey>>(new Set());

  function handleDelete(row: ResponsableListRow) {
    const ok = window.confirm(
      `¿Borrar al responsable ${row.nombre ?? row.email}? Sus entidades asignadas quedan libres (las consultas las recibís vos como admin hasta que asignes a otro).`
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
    setEditNombre(row.nombre ?? "");
    setEditSelected(new Set(row.entidades.map((e) => keyOf(e))));
    setError(null);
    setFieldErrors({});
  }

  function toggleEdit(e: { tipo: EntidadAsignable["tipo"]; id: string }) {
    setEditSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(e);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function saveEdit(row: ResponsableListRow) {
    setError(null);
    setFieldErrors({});
    const seleccionadas: Array<{ tipo: EntidadAsignable["tipo"]; id: string }> = [];
    for (const k of editSelected) {
      const [tipo, id] = k.split(":") as [EntidadAsignable["tipo"], string];
      seleccionadas.push({ tipo, id });
    }
    startTransition(async () => {
      const res = await updateResponsableAction({
        responsableId: row.id,
        nombre: editNombre.trim(),
        entidades: seleccionadas,
      });
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
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
        // Para el edit: las entidades disponibles + las del responsable actual
        // (aunque "ocupadas" por él mismo).
        const opcionesEdit: EntidadAsignable[] = isEditing
          ? [
              ...entidadesDisponibles,
              ...r.entidades
                .filter(
                  (e) =>
                    !entidadesDisponibles.some(
                      (d) => d.tipo === e.tipo && d.id === e.id
                    )
                )
                .map<EntidadAsignable>((e) => ({
                  tipo: e.tipo,
                  id: e.id,
                  nombre: e.nombre,
                  destinoId: e.destinoId,
                  destinoNombre: "",
                })),
            ]
          : [];

        return (
          <article
            key={r.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/admin/responsables/${r.id}`}
                    className="font-display text-lg tracking-tight hover:text-primary hover:underline"
                  >
                    {r.nombre ?? "—"}
                  </a>
                  {r.isAlsoAdmin && (
                    <span
                      title={
                        r.isSuperAdmin
                          ? "Super Administrador con entidades propias. Gestiona su cuenta desde /admin/admins."
                          : "Administrador Local con entidades propias. Gestiona su cuenta desde /admin/admins."
                      }
                      className="inline-flex cursor-help items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {r.isSuperAdmin ? "Super Admin" : "Admin Local"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{r.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {r.isAlsoAdmin ? (
                  <span className="text-xs italic text-muted-foreground">
                    Se gestiona desde Administradores
                  </span>
                ) : (
                  <>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Editar
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
                  </>
                )}
              </div>
            </header>

            {isEditing ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium">
                    Nombre completo <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    placeholder="María Pérez"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  {fieldErrors.nombre && (
                    <p className="mt-1 text-xs text-rose-600">
                      {fieldErrors.nombre}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    El email no se puede cambiar desde acá.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tildá las entidades que querés que gestione. Las ya asignadas
                  a otro responsable no aparecen — desvinculalas primero.
                </p>
                <EditEntidadSection
                  icon={<Building2 className="h-3.5 w-3.5" />}
                  label="Hospedajes"
                  items={opcionesEdit.filter((e) => e.tipo === "hospedaje")}
                  selected={editSelected}
                  onToggle={toggleEdit}
                />
                <EditEntidadSection
                  icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
                  label="Gastronómicos"
                  items={opcionesEdit.filter((e) => e.tipo === "gastronomico")}
                  selected={editSelected}
                  onToggle={toggleEdit}
                />
                <EditEntidadSection
                  icon={<Compass className="h-3.5 w-3.5" />}
                  label="Qué hacer"
                  items={opcionesEdit.filter((e) => e.tipo === "atractivo")}
                  selected={editSelected}
                  onToggle={toggleEdit}
                />
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
              <div className="mt-3 space-y-2">
                {r.entidades.length === 0 ? (
                  <span className="inline-block text-sm text-muted-foreground italic">
                    Sin entidades asignadas — editá para vincularle hospedajes,
                    gastronómicos o qué hacer.
                  </span>
                ) : (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {r.entidades.length} comercio{r.entidades.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {r.entidades.map((e) => (
                        <span
                          key={`${e.tipo}:${e.id}`}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            e.tipo === "hospedaje"
                              ? "bg-sky-100 text-sky-900"
                              : e.tipo === "atractivo"
                                ? "bg-teal-100 text-teal-900"
                                : "bg-amber-100 text-amber-900"
                          }`}
                          title={
                            e.tipo === "hospedaje"
                              ? "Hospedaje"
                              : e.tipo === "atractivo"
                                ? "Qué hacer"
                                : "Gastronómico"
                          }
                        >
                          {e.tipo === "hospedaje" ? (
                            <Building2 className="h-3 w-3" />
                          ) : e.tipo === "atractivo" ? (
                            <Compass className="h-3 w-3" />
                          ) : (
                            <UtensilsCrossed className="h-3 w-3" />
                          )}
                          {e.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

interface EditEntidadSectionProps {
  icon: React.ReactNode;
  label: string;
  items: EntidadAsignable[];
  selected: Set<EntidadKey>;
  onToggle: (e: { tipo: EntidadAsignable["tipo"]; id: string }) => void;
}

function EditEntidadSection({
  icon,
  label,
  items,
  selected,
  onToggle,
}: EditEntidadSectionProps) {
  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
        <span className="ml-auto text-[10px] font-normal normal-case">
          {items.length} disponible{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-40 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Ninguno disponible.
          </p>
        ) : (
          items.map((it) => (
            <label
              key={it.id}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm transition hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={selected.has(keyOf(it))}
                onChange={() => onToggle(it)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="flex-1">{it.nombre}</span>
              {it.destinoNombre && (
                <span className="text-xs text-muted-foreground">
                  {it.destinoNombre}
                </span>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
