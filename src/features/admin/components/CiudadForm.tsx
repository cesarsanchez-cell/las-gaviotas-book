"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { CiudadRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

interface CiudadFormProps {
  ciudad?: CiudadRow;
  /** Regiones para vincular la ciudad (la ciudad "corta" por región). */
  regiones: Array<{ id: string; nombre: string }>;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}

export function CiudadForm({
  ciudad,
  regiones,
  action,
  submitLabel,
}: CiudadFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState(ciudad?.nombre ?? "");
  const [slug, setSlug] = useState(ciudad?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(Boolean(ciudad?.slug));

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const res = await action(formData);
      if (res.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      router.refresh();
    });
  }

  const fe = (k: string) => fieldErrors[k];
  const inputBase =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="ciu-nombre">
            Nombre <span className="text-rose-600">*</span>
          </label>
          <input
            id="ciu-nombre"
            name="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugDirty) setSlug(slugify(e.target.value));
            }}
            placeholder="Villa Gesell"
            className={inputBase}
          />
          {fe("nombre") && (
            <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="ciu-slug">
            Slug <span className="text-rose-600">*</span>
          </label>
          <input
            id="ciu-slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            placeholder="villa-gesell"
            className={`${inputBase} font-mono`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Se autogenera desde el nombre. Solo minúsculas, números y guiones.
          </p>
          {fe("slug") && (
            <p className="mt-1 text-xs text-rose-600">{fe("slug")}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="ciu-region">
            Región <span className="text-rose-600">*</span>
          </label>
          <select
            id="ciu-region"
            name="region_id"
            defaultValue={ciudad?.region_id ?? ""}
            className={inputBase}
          >
            <option value="">— Elegí una región —</option>
            {regiones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            La ciudad agrupa destinos dentro de esta región.
          </p>
          {fe("region_id") && (
            <p className="mt-1 text-xs text-rose-600">{fe("region_id")}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="ciu-cp">
            Código postal
          </label>
          <input
            id="ciu-cp"
            name="codigo_postal"
            type="text"
            defaultValue={ciudad?.codigo_postal ?? ""}
            placeholder="7165"
            className={inputBase}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Informativo (puede haber varios).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="ciu-orden">
            Orden
          </label>
          <input
            id="ciu-orden"
            name="orden"
            type="number"
            min={0}
            max={10000}
            defaultValue={ciudad?.orden ?? 0}
            className={inputBase}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={ciudad?.activo ?? true}
              className="h-4 w-4 rounded border-input"
            />
            Activa
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
