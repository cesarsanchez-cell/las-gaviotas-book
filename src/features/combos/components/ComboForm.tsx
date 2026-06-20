"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import type { ActionResult } from "@/features/combos/lib/actions";
import type {
  ComboWithItems,
  ComercioOption,
} from "@/features/combos/lib/queries";
import type { ComercioTipo } from "@/types/database";

const TIPO_GROUP_LABEL: Record<ComercioTipo, string> = {
  hospedaje: "Hospedajes",
  gastronomico: "Gastronomía",
  atractivo: "Qué hacer",
};

interface ItemRow {
  comercio: string; // `${tipo}:${id}`
  beneficio: string;
}

interface ComboFormProps {
  comercios: ComercioOption[];
  initial?: ComboWithItems;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult | void>;
}

export function ComboForm({ comercios, initial, submitLabel, action }: ComboFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const multiDestino = new Set(comercios.map((c) => c.destinoId)).size > 1;

  const [items, setItems] = React.useState<ItemRow[]>(
    initial
      ? initial.items.map((it) => ({
          comercio: `${it.comercio_tipo}:${it.comercio_id}`,
          beneficio: it.beneficio,
        }))
      : [
          { comercio: "", beneficio: "" },
          { comercio: "", beneficio: "" },
        ]
  );
  const [beneficios, setBeneficios] = React.useState<string[]>(
    initial?.combo.beneficios?.length ? initial.combo.beneficios : [""]
  );

  const grupos = React.useMemo(() => {
    const by: Record<ComercioTipo, ComercioOption[]> = {
      hospedaje: [],
      gastronomico: [],
      atractivo: [],
    };
    for (const c of comercios) by[c.tipo].push(c);
    return by;
  }, [comercios]);

  function fieldError(name: string): string | undefined {
    return result?.fieldErrors?.[name];
  }

  function setItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(items.filter((it) => it.comercio)));
    fd.set("beneficios", JSON.stringify(beneficios.filter((b) => b.trim())));
    startTransition(async () => {
      const r = await action(fd);
      if (r) {
        setResult(r);
        if (r.ok) router.refresh();
      }
    });
  }

  if (comercios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="font-display text-lg">No hay comercios disponibles.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Un combo cruza comercios publicados. Necesitás al menos un par
          publicados en tu destino.
        </p>
      </div>
    );
  }

  const comercioSelect = (i: number) => (
    <Select
      value={items[i].comercio}
      onChange={(e) => setItem(i, { comercio: e.target.value })}
      required
    >
      <option value="">Elegí un comercio…</option>
      {(Object.keys(grupos) as ComercioTipo[]).map((tipo) =>
        grupos[tipo].length === 0 ? null : (
          <optgroup key={tipo} label={TIPO_GROUP_LABEL[tipo]}>
            {grupos[tipo].map((c) => (
              <option key={`${c.tipo}:${c.id}`} value={`${c.tipo}:${c.id}`}>
                {c.nombre}
                {multiDestino ? ` · ${c.destinoNombre}` : ""}
              </option>
            ))}
          </optgroup>
        )
      )}
    </Select>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {result?.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título del combo</Label>
        <Input
          id="titulo"
          name="titulo"
          defaultValue={initial?.combo.titulo ?? ""}
          placeholder="ej: Mar y mesa"
          maxLength={120}
          required
        />
        {fieldError("titulo") && <p className="text-sm text-rose-700">{fieldError("titulo")}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bajada">Bajada (opcional)</Label>
        <Textarea
          id="bajada"
          name="bajada"
          defaultValue={initial?.combo.bajada ?? ""}
          placeholder="Dos noches frente al bosque, una mesa con vista al mar…"
          maxLength={300}
          rows={2}
        />
      </div>

      {/* Items del combo */}
      <fieldset className="space-y-3 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-medium">Comercios del combo (2-3)</legend>
        {fieldError("items") && <p className="text-sm text-rose-700">{fieldError("items")}</p>}
        {items.map((it, i) => (
          <div key={i} className="space-y-2 rounded-lg bg-secondary/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Item {i + 1}
              </span>
              {items.length > 2 && (
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1 text-xs text-rose-700 hover:underline"
                >
                  <X className="h-3 w-3" /> Quitar
                </button>
              )}
            </div>
            {comercioSelect(i)}
            <Input
              value={it.beneficio}
              onChange={(e) => setItem(i, { beneficio: e.target.value })}
              placeholder="Beneficio de este comercio (ej: 2 noches en cabaña para 4)"
              maxLength={200}
            />
          </div>
        ))}
        {items.length < 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, { comercio: "", beneficio: "" }])}
          >
            <Plus className="h-4 w-4" /> Agregar comercio
          </Button>
        )}
      </fieldset>

      {/* Beneficios cruzados */}
      <fieldset className="space-y-2 rounded-xl border border-border p-4">
        <legend className="px-1 text-sm font-medium">
          Beneficios cruzados (opcional)
        </legend>
        <p className="text-xs text-muted-foreground">
          Ventajas que se activan al combinar los comercios.
        </p>
        {beneficios.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={b}
              onChange={(e) =>
                setBeneficios((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              placeholder="ej: Late check-out si reservás la cena primero"
              maxLength={200}
            />
            {beneficios.length > 1 && (
              <button
                type="button"
                onClick={() => setBeneficios((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Quitar beneficio"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {beneficios.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBeneficios((prev) => [...prev, ""])}
          >
            <Plus className="h-4 w-4" /> Agregar beneficio
          </Button>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="noches">Noches</Label>
          <Input
            id="noches"
            name="noches"
            type="number"
            min={1}
            max={60}
            defaultValue={initial?.combo.noches ?? 1}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio_desde">Precio desde (ARS)</Label>
          <Input
            id="precio_desde"
            name="precio_desde"
            type="number"
            min={0}
            defaultValue={initial?.combo.precio_desde ?? ""}
            placeholder="ej: 64000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ahorro_pct">Ahorro % (opcional)</Label>
          <Input
            id="ahorro_pct"
            name="ahorro_pct"
            type="number"
            min={1}
            max={100}
            defaultValue={initial?.combo.ahorro_pct ?? ""}
            placeholder="ej: 18"
          />
          {fieldError("ahorro_pct") && (
            <p className="text-sm text-rose-700">{fieldError("ahorro_pct")}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="validez">Validez (opcional)</Label>
        <Input
          id="validez"
          name="validez"
          defaultValue={initial?.combo.validez ?? ""}
          placeholder="ej: Válido domingo a jueves · hasta 30 nov 2026"
          maxLength={160}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {result?.ok && <span className="text-sm text-emerald-700">Guardado.</span>}
      </div>
    </form>
  );
}
