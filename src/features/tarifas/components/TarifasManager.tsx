"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Save, Calendar } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/DateField";
import {
  createTarifaAction,
  updateTarifaAction,
  deleteTarifaAction,
} from "@/features/tarifas/lib/actions";
import type { TarifaRow } from "@/types/database";

interface TarifasManagerProps {
  unidadTypeId: string;
  tarifas: TarifaRow[];
  /** Si true, el usuario no puede editar (vista admin read-only). */
  readOnly?: boolean;
}

function formatPrecio(precio: number, moneda: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(precio);
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function TarifasManager({
  unidadTypeId,
  tarifas,
  readOnly = false,
}: TarifasManagerProps) {
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
    error: string | undefined,
    fieldErrors: Record<string, string> | undefined
  ): string {
    // Si hay fieldErrors, mostramos el más específico. Si no, el error genérico.
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const labels: Record<string, string> = {
        nombre: "Nombre",
        desde: "Desde",
        hasta: "Hasta",
        precioNoche: "Precio",
        moneda: "Moneda",
        notas: "Notas",
      };
      const first = Object.entries(fieldErrors)[0];
      const [field, msg] = first;
      const label = labels[field] ?? field;
      return `${label}: ${msg}`;
    }
    return error ?? "Error desconocido.";
  }

  async function handleCreate(formData: FormData) {
    setError(null);
    const input = {
      unidadTypeId,
      nombre: String(formData.get("nombre") ?? "").trim(),
      desde: String(formData.get("desde") ?? ""),
      hasta: String(formData.get("hasta") ?? ""),
      precioNoche: Number(formData.get("precioNoche") ?? 0),
      moneda: String(formData.get("moneda") ?? "ARS") as "ARS" | "USD",
      notas: String(formData.get("notas") ?? "").trim() || undefined,
    };
    startTransition(async () => {
      const r = await createTarifaAction(input);
      if (r?.error || r?.fieldErrors) {
        setError(buildError(r.error, r.fieldErrors));
        return;
      }
      reset();
      router.refresh();
    });
  }

  async function handleUpdate(formData: FormData, tarifaId: string) {
    setError(null);
    const input = {
      id: tarifaId,
      unidadTypeId,
      nombre: String(formData.get("nombre") ?? "").trim(),
      desde: String(formData.get("desde") ?? ""),
      hasta: String(formData.get("hasta") ?? ""),
      precioNoche: Number(formData.get("precioNoche") ?? 0),
      moneda: String(formData.get("moneda") ?? "ARS") as "ARS" | "USD",
      notas: String(formData.get("notas") ?? "").trim() || undefined,
    };
    startTransition(async () => {
      const r = await updateTarifaAction(input);
      if (r?.error || r?.fieldErrors) {
        setError(buildError(r.error, r.fieldErrors));
        return;
      }
      reset();
      router.refresh();
    });
  }

  async function handleDelete(tarifaId: string) {
    if (!confirm("¿Borrar esta tarifa? Esta acción no se puede deshacer.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await deleteTarifaAction(tarifaId);
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
          <h2 className="font-display text-lg tracking-tight">Tarifas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Precio por noche de la unidad entera, por rango de fechas. Si dos
            tarifas pisan la misma noche gana la cargada más recientemente.
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
            Nueva tarifa
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && !readOnly && (
        <TarifaForm
          submitLabel="Crear tarifa"
          pending={pending}
          onSubmit={handleCreate}
          onCancel={reset}
        />
      )}

      <div className="mt-5">
        {tarifas.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-background px-4 py-8 text-center">
            <Calendar
              className="mx-auto h-6 w-6 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {readOnly
                ? "El responsable todavía no cargó tarifas."
                : "Todavía no cargaste tarifas. Sin tarifas, la unidad muestra «Precio a consultar»."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-background">
            {tarifas.map((t) => {
              const editing = editingId === t.id;
              if (editing && !readOnly) {
                return (
                  <li key={t.id} className="p-4">
                    <TarifaForm
                      initial={t}
                      submitLabel="Guardar"
                      pending={pending}
                      onSubmit={(fd) => handleUpdate(fd, t.id)}
                      onCancel={reset}
                    />
                  </li>
                );
              }
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFecha(t.desde)} → {formatFecha(t.hasta)}
                      {t.notas && ` · ${t.notas}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-sm font-medium">
                      {formatPrecio(Number(t.precio_noche), t.moneda)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        / noche
                      </span>
                    </p>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(t.id);
                            setShowForm(false);
                            setError(null);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Editar tarifa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          disabled={pending}
                          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                          aria-label="Borrar tarifa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

interface TarifaFormProps {
  initial?: TarifaRow;
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

function TarifaForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: TarifaFormProps) {
  const [desde, setDesde] = React.useState<string>(initial?.desde ?? "");
  const [hasta, setHasta] = React.useState<string>(initial?.hasta ?? "");

  const hastaMin = desde ? addDaysISO(desde, 1) : undefined;

  function handleDesdeChange(iso: string) {
    setDesde(iso);
    // Si la fecha "hasta" cae antes (o igual) que la nueva "desde", la
    // empujamos a desde+1 para mantener el rango coherente.
    if (iso && hasta && hasta <= iso) {
      setHasta(addDaysISO(iso, 1));
    }
  }

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="precioNoche">Precio por noche</Label>
          <Input
            id="precioNoche"
            name="precioNoche"
            type="number"
            min="0"
            step="100"
            required
            defaultValue={initial?.precio_noche ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="moneda">Moneda</Label>
          <select
            id="moneda"
            name="moneda"
            defaultValue={initial?.moneda ?? "ARS"}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="ARS">ARS — Peso argentino</option>
            <option value="USD">USD — Dólar</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="notas">Notas internas (opcional)</Label>
        <Input
          id="notas"
          name="notas"
          defaultValue={initial?.notas ?? ""}
          placeholder="Ej: Promo familia, válida con check-in domingo"
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
