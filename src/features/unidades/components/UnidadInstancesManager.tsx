"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { UnidadRow } from "@/types/database";
import {
  createUnidadAction,
  createMultiplesUnidadesAction,
  updateUnidadAction,
  toggleUnidadActivaAction,
  deleteUnidadAction,
} from "@/features/unidades/lib/actions";

interface Props {
  unidadTypeId: string;
  unidadTypeNombre: string;
  unidades: UnidadRow[];
}

type Mode = "single" | "batch";

export function UnidadInstancesManager({
  unidadTypeId,
  unidadTypeNombre,
  unidades,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(unidades.length === 0 ? "batch" : "single");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refreshAfter(res: { error?: string } | undefined) {
    if (res?.error) {
      setError(res.error);
      return;
    }
    setError(null);
    setEditingId(null);
    router.refresh();
  }

  // ---------- Alta single ----------
  function handleSingleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await createUnidadAction(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  // ---------- Alta batch ----------
  function handleBatchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const cantidad = Number(fd.get("cantidad"));
    const prefijo = String(fd.get("prefijo") ?? "").trim() || undefined;
    const inicio = Number(fd.get("inicio_numeracion") ?? 1);
    const form = e.currentTarget;
    startTransition(async () => {
      const res = await createMultiplesUnidadesAction({
        unidad_type_id: unidadTypeId,
        cantidad,
        prefijo,
        inicio_numeracion: inicio,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      form.reset();
      // Pasar al modo single para próximas altas individuales.
      setMode("single");
      router.refresh();
    });
  }

  // ---------- Acciones por fila ----------
  function handleToggle(id: string) {
    startTransition(async () => {
      const res = await toggleUnidadActivaAction(id);
      refreshAfter(res);
    });
  }

  function handleDelete(id: string, nombre: string) {
    if (
      !confirm(
        `¿Borrar "${nombre}"?\n\nEsta acción borra también su calendario de disponibilidad. No se puede deshacer.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteUnidadAction(id);
      refreshAfter(res);
    });
  }

  function handleEditSubmit(e: FormEvent<HTMLFormElement>, unidadId: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("unidad_type_id", unidadTypeId);
    startTransition(async () => {
      const res = await updateUnidadAction(unidadId, formData);
      refreshAfter(res);
    });
  }

  const inputBase =
    "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6">
      <header>
        <h2 className="font-display text-lg tracking-tight">Unidades físicas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada unidad física es una instancia real del tipo (la cabaña concreta,
          el dúplex puntual). Tienen calendario propio. Mismo tipo, distinta
          unidad = mismas amenities pero distinto día disponible.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Selector de modo */}
      <div className="inline-flex rounded-md border border-input bg-background p-0.5">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition ${
            mode === "single"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar una
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium transition ${
            mode === "batch"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Copy className="h-3.5 w-3.5" />
          Crear varias de golpe
        </button>
      </div>

      {/* Alta single */}
      {mode === "single" && (
        <form onSubmit={handleSingleSubmit} className="space-y-3" noValidate>
          <input type="hidden" name="unidad_type_id" value={unidadTypeId} />
          <input type="hidden" name="activa" value="true" />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label className="text-xs font-medium" htmlFor="nombre-single">
                Nombre de la unidad
              </label>
              <input
                id="nombre-single"
                name="nombre"
                type="text"
                required
                maxLength={60}
                placeholder={`${unidadTypeNombre} 1`}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Alta batch */}
      {mode === "batch" && (
        <form onSubmit={handleBatchSubmit} className="space-y-3" noValidate>
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Genera N unidades con nombres autoincrementales. Ej: prefijo
            &quot;{unidadTypeNombre}&quot;, cantidad 3, inicio 1 →{" "}
            <strong>{unidadTypeNombre} 1</strong>, <strong>{unidadTypeNombre} 2</strong>,{" "}
            <strong>{unidadTypeNombre} 3</strong>.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-medium" htmlFor="cantidad">
                Cantidad
              </label>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min={1}
                max={50}
                required
                defaultValue={2}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor="prefijo">
                Prefijo
              </label>
              <input
                id="prefijo"
                name="prefijo"
                type="text"
                maxLength={60}
                placeholder={unidadTypeNombre}
                className={`mt-1 ${inputBase}`}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Vacío = usa el nombre del tipo.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor="inicio_numeracion">
                Empezar desde
              </label>
              <input
                id="inicio_numeracion"
                name="inicio_numeracion"
                type="number"
                min={1}
                max={999}
                defaultValue={unidades.length + 1}
                className={`mt-1 ${inputBase}`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Crear
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {unidades.length === 0
            ? "Sin unidades físicas todavía."
            : `${unidades.length} ${
                unidades.length === 1 ? "unidad cargada" : "unidades cargadas"
              }`}
        </h3>
        {unidades.map((u) => {
          const isEditing = editingId === u.id;
          if (isEditing) {
            return (
              <form
                key={u.id}
                onSubmit={(e) => handleEditSubmit(e, u.id)}
                className="rounded-md border border-primary bg-primary/5 p-3"
                noValidate
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    name="nombre"
                    type="text"
                    required
                    maxLength={60}
                    defaultValue={u.nombre}
                    className={inputBase}
                  />
                  <input
                    type="hidden"
                    name="activa"
                    value={u.activa ? "true" : ""}
                  />
                  <input
                    type="hidden"
                    name="orden"
                    value={u.orden}
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm transition hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {u.notas_internas && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Notas internas: {u.notas_internas}
                  </p>
                )}
              </form>
            );
          }
          return (
            <div
              key={u.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm ${
                u.activa
                  ? "border-border"
                  : "border-border/60 bg-muted/30 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{u.nombre}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                    u.activa
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {u.activa ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                  ) : (
                    <XCircle className="h-3 w-3" aria-hidden />
                  )}
                  {u.activa ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggle(u.id)}
                  disabled={pending}
                  className="rounded border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                  title={u.activa ? "Desactivar" : "Activar"}
                >
                  {u.activa ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(u.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-xs transition hover:bg-secondary disabled:opacity-50"
                >
                  <Pencil className="h-3 w-3" />
                  Renombrar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id, u.nombre)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  title="Borrar permanentemente"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
