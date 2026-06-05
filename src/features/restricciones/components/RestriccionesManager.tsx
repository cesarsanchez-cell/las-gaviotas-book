"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Save, SlidersHorizontal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/DateField";
import {
  createRestriccionAction,
  updateRestriccionAction,
  deleteRestriccionAction,
} from "@/features/restricciones/lib/actions";
import { describirRestriccion } from "@/features/restricciones/lib/logic";
import type { RestriccionRow } from "@/types/database";

interface RestriccionesManagerProps {
  unidadTypeId: string;
  restricciones: RestriccionRow[];
  /** Si true, el usuario no puede editar (vista admin read-only). */
  readOnly?: boolean;
}

const DIAS: { value: string; label: string }[] = [
  { value: "", label: "Cualquier día" },
  { value: "1", label: "Lunes" },
  { value: "2", label: "Martes" },
  { value: "3", label: "Miércoles" },
  { value: "4", label: "Jueves" },
  { value: "5", label: "Viernes" },
  { value: "6", label: "Sábado" },
  { value: "7", label: "Domingo" },
];

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  desde: "Desde",
  hasta: "Hasta",
  estadiaMinimaNoches: "Estadía mínima",
  diaIngreso: "Día de ingreso",
  diaEgreso: "Día de egreso",
  notas: "Notas",
};

export function RestriccionesManager({
  unidadTypeId,
  restricciones,
  readOnly = false,
}: RestriccionesManagerProps) {
  const router = useRouter();
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function buildError(
    err: string | undefined,
    fieldErrors: Record<string, string> | undefined
  ): string {
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const [field, msg] = Object.entries(fieldErrors)[0];
      const label = FIELD_LABELS[field] ?? field;
      return `${label}: ${msg}`;
    }
    return err ?? "Error desconocido.";
  }

  function buildInput(formData: FormData) {
    const num = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v === "" ? undefined : v;
    };
    return {
      unidadTypeId,
      nombre: String(formData.get("nombre") ?? "").trim(),
      desde: String(formData.get("desde") ?? ""),
      hasta: String(formData.get("hasta") ?? ""),
      estadiaMinimaNoches: num("estadiaMinimaNoches"),
      diaIngreso: num("diaIngreso"),
      diaEgreso: num("diaEgreso"),
      notas: String(formData.get("notas") ?? "").trim() || undefined,
    };
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    const input = buildInput(formData);
    startTransition(async () => {
      const r = await createRestriccionAction(input);
      if (r?.error || r?.fieldErrors) {
        setError(buildError(r.error, r.fieldErrors));
        return;
      }
      reset();
      router.refresh();
    });
  }

  async function handleUpdate(formData: FormData, restriccionId: string) {
    setError(null);
    const input = { ...buildInput(formData), id: restriccionId };
    startTransition(async () => {
      const r = await updateRestriccionAction(input);
      if (r?.error || r?.fieldErrors) {
        setError(buildError(r.error, r.fieldErrors));
        return;
      }
      reset();
      router.refresh();
    });
  }

  async function handleDelete(restriccionId: string) {
    if (!confirm("¿Borrar esta restricción? Esta acción no se puede deshacer.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await deleteRestriccionAction(restriccionId);
      if (r?.error) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">Restricciones</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reglas por temporada: estadía mínima de noches y/o día fijo de
            ingreso/egreso. Aplican a las búsquedas cuyo check-in caiga dentro
            del rango de fechas de la restricción.
          </p>
        </div>
        {!readOnly && !showForm && editingId === null && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setShowForm(true);
              setError(null);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva restricción
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && !readOnly && (
        <RestriccionForm
          submitLabel="Crear restricción"
          pending={pending}
          onSubmit={handleCreate}
          onCancel={reset}
        />
      )}

      <div className="mt-5">
        {restricciones.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
            <SlidersHorizontal
              className="mx-auto h-6 w-6 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {readOnly
                ? "El responsable todavía no cargó restricciones."
                : "Sin restricciones: la unidad se ofrece para cualquier rango y duración."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-background">
            {restricciones.map((r) => {
              const editing = editingId === r.id;
              if (editing && !readOnly) {
                return (
                  <li key={r.id} className="p-4">
                    <RestriccionForm
                      initial={r}
                      submitLabel="Guardar"
                      pending={pending}
                      onSubmit={(fd) => handleUpdate(fd, r.id)}
                      onCancel={reset}
                    />
                  </li>
                );
              }
              const chips = describirRestriccion(r);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{r.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(r.desde)} → {formatFecha(r.hasta)}
                      {r.notas && ` · ${r.notas}`}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {chips.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setShowForm(false);
                          setError(null);
                        }}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label="Editar restricción"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={pending}
                        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        aria-label="Borrar restricción"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

interface RestriccionFormProps {
  initial?: RestriccionRow;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}

function addDaysISO(iso: string, days: number): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function RestriccionForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: RestriccionFormProps) {
  const [desde, setDesde] = React.useState<string>(initial?.desde ?? "");
  const [hasta, setHasta] = React.useState<string>(initial?.hasta ?? "");

  const hastaMin = desde ? addDaysISO(desde, 0) : undefined;

  function handleDesdeChange(iso: string) {
    setDesde(iso);
    // El rango de la restricción puede ser de un solo día (desde === hasta),
    // por eso solo empujamos "hasta" si quedó estrictamente antes que "desde".
    if (iso && hasta && hasta < iso) {
      setHasta(iso);
    }
  }

  const selectCls =
    "mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <form
      action={onSubmit}
      className="mt-4 space-y-4 rounded-lg border border-border bg-background p-4"
    >
      <div>
        <Label htmlFor="nombre">Nombre / temporada</Label>
        <Input
          id="nombre"
          name="nombre"
          required
          defaultValue={initial?.nombre ?? ""}
          placeholder="Ej: Temporada alta enero"
          maxLength={80}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="desde">Desde</Label>
          <DateField
            id="desde"
            name="desde"
            required
            value={desde}
            onChange={handleDesdeChange}
          />
        </div>
        <div>
          <Label htmlFor="hasta">Hasta</Label>
          <DateField
            id="hasta"
            name="hasta"
            required
            value={hasta}
            min={hastaMin}
            onChange={setHasta}
          />
        </div>
      </div>

      <div className="rounded-md border border-dashed border-border p-3">
        <p className="text-xs text-muted-foreground">
          Definí al menos una regla. Dejá un campo vacío / «Cualquier día» para
          no exigirlo.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="estadiaMinimaNoches">Estadía mínima (noches)</Label>
            <Input
              id="estadiaMinimaNoches"
              name="estadiaMinimaNoches"
              type="number"
              min="1"
              max="365"
              defaultValue={initial?.estadia_minima_noches ?? ""}
              placeholder="Ej: 3"
            />
          </div>
          <div>
            <Label htmlFor="diaIngreso">Día de ingreso</Label>
            <select
              id="diaIngreso"
              name="diaIngreso"
              defaultValue={
                initial?.dia_ingreso != null ? String(initial.dia_ingreso) : ""
              }
              className={selectCls}
            >
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="diaEgreso">Día de egreso</Label>
            <select
              id="diaEgreso"
              name="diaEgreso"
              defaultValue={
                initial?.dia_egreso != null ? String(initial.dia_egreso) : ""
              }
              className={selectCls}
            >
              {DIAS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notas">Notas internas (opcional)</Label>
        <Input
          id="notas"
          name="notas"
          defaultValue={initial?.notas ?? ""}
          placeholder="Ej: Solo en quincenas de enero"
          maxLength={500}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className={buttonVariants({ variant: "outline" })}
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </form>
  );
}
