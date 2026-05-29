"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ActionResult } from "@/features/promos/lib/actions";
import type { ComercioOption } from "@/features/promos/lib/queries";
import type { ComercioTipo, PromoRow } from "@/types/database";

const TIPO_GROUP_LABEL: Record<ComercioTipo, string> = {
  hospedaje: "Hospedajes",
  gastronomico: "Gastronomía",
  atractivo: "Atractivos",
};

interface PromoFormProps {
  comercios: ComercioOption[];
  initial?: Partial<PromoRow>;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult | void>;
}

export function PromoForm({ comercios, initial, submitLabel, action }: PromoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const multiDestino = new Set(comercios.map((c) => c.destinoId)).size > 1;
  const initialComercio =
    initial?.comercio_tipo && initial?.comercio_id
      ? `${initial.comercio_tipo}:${initial.comercio_id}`
      : comercios[0]
        ? `${comercios[0].tipo}:${comercios[0].id}`
        : "";

  const [comercio, setComercio] = React.useState(initialComercio);
  const [desde, setDesde] = React.useState(initial?.vigencia_desde ?? "");
  const [hasta, setHasta] = React.useState(initial?.vigencia_hasta ?? "");

  // Agrupamos las opciones por tipo para los <optgroup>.
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

  function onChangeDesde(v: string) {
    setDesde(v);
    if (hasta && v && hasta < v) setHasta("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await action(fd);
      if (r) {
        setResult(r);
        if (!r.ok && r.fieldErrors) {
          const first = Object.keys(r.fieldErrors)[0];
          document.getElementById(first)?.focus();
        }
      }
      if (r?.ok) router.refresh();
    });
  }

  if (comercios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <p className="font-display text-lg">No hay comercios disponibles.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Una promo se carga sobre un hospedaje o lugar publicado. Cargá y publicá
          un comercio primero.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {result?.error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="comercio">Comercio</Label>
        <Select
          id="comercio"
          name="comercio"
          value={comercio}
          onChange={(e) => setComercio(e.target.value)}
          required
        >
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
        {fieldError("comercio") && (
          <p className="text-sm text-rose-700">{fieldError("comercio")}</p>
        )}
        <p className="text-xs text-muted-foreground">
          La foto de la promo se toma de la foto principal del comercio.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          name="titulo"
          defaultValue={initial?.titulo ?? ""}
          placeholder="ej: 3 noches al precio de 2"
          maxLength={120}
          required
        />
        {fieldError("titulo") && (
          <p className="text-sm text-rose-700">{fieldError("titulo")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="beneficio">Beneficio</Label>
        <Input
          id="beneficio"
          name="beneficio"
          defaultValue={initial?.beneficio ?? ""}
          placeholder="ej: 30% off pagando en efectivo"
          maxLength={160}
          required
        />
        {fieldError("beneficio") && (
          <p className="text-sm text-rose-700">{fieldError("beneficio")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bajada">Bajada (opcional)</Label>
        <Textarea
          id="bajada"
          name="bajada"
          defaultValue={initial?.bajada ?? ""}
          placeholder="Una línea más de detalle para la card."
          maxLength={200}
          rows={2}
        />
        {fieldError("bajada") && (
          <p className="text-sm text-rose-700">{fieldError("bajada")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pct">Descuento % (opcional)</Label>
          <Input
            id="pct"
            name="pct"
            type="number"
            min={1}
            max={100}
            defaultValue={initial?.pct ?? ""}
            placeholder="ej: 30"
          />
          {fieldError("pct") && (
            <p className="text-sm text-rose-700">{fieldError("pct")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vigencia_desde">Vigente desde</Label>
          <Input
            id="vigencia_desde"
            name="vigencia_desde"
            type="date"
            value={desde}
            onChange={(e) => onChangeDesde(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vigencia_hasta">Vigente hasta</Label>
          <Input
            id="vigencia_hasta"
            name="vigencia_hasta"
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => setHasta(e.target.value)}
          />
          {fieldError("vigencia_hasta") && (
            <p className="text-sm text-rose-700">{fieldError("vigencia_hasta")}</p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <Checkbox name="activo" defaultChecked={initial?.activo ?? true} />
        <span className="text-sm">Activa (visible al público si está vigente)</span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {result?.ok && (
          <span className="text-sm text-emerald-700">Guardado.</span>
        )}
      </div>
    </form>
  );
}
