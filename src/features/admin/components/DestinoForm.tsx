"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { DestinoRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import { slugify } from "@/lib/utils";

interface Props {
  initial?: DestinoRow;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult>;
}

export function DestinoForm({ initial, submitLabel, action }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState<string>(initial?.nombre ?? "");
  const [slug, setSlug] = useState<string>(initial?.slug ?? "");
  // Si estamos editando, no auto-sugerimos slug (el usuario ya tiene uno fijo).
  // Si es alta, auto-sugerimos hasta que el usuario edite el slug manualmente.
  const [slugDirty, setSlugDirty] = useState<boolean>(Boolean(initial?.slug));

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(formData);
      if (res?.error) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
      // Si createDestinoAction tuvo éxito, redirige (no entra acá).
      // Si updateDestinoAction tuvo éxito, devuelve {ok:true} y el form
      // mantiene los valores cargados (no resetea, igual UX de consultas).
    });
  }

  const fe = (k: string) => fieldErrors[k];
  const inputBase =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  const cls = (k: string) =>
    `${inputBase}${fieldErrors[k] ? " border-rose-400 focus:ring-rose-300" : ""}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Identidad</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="nombre">
              Nombre <span className="text-rose-600">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => {
                const v = e.target.value;
                setNombre(v);
                if (!slugDirty) setSlug(slugify(v));
              }}
              placeholder="Mar Azul"
              className={cls("nombre")}
            />
            {fe("nombre") && (
              <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="slug">
              Slug <span className="text-rose-600">*</span>
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugDirty(true);
              }}
              placeholder="mar-azul"
              className={cls("slug")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL pública: <code>/{`{slug}`}</code>. Se autogenera desde el
              nombre, podés editarlo. Solo minúsculas, números y guiones.
            </p>
            {fe("slug") && (
              <p className="mt-1 text-xs text-rose-600">{fe("slug")}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium" htmlFor="region">
              Región
            </label>
            <input
              id="region"
              name="region"
              type="text"
              defaultValue={initial?.region ?? ""}
              placeholder="Costa Atlántica"
              className={cls("region")}
            />
            {fe("region") && (
              <p className="mt-1 text-xs text-rose-600">{fe("region")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="provincia">
              Provincia
            </label>
            <input
              id="provincia"
              name="provincia"
              type="text"
              defaultValue={initial?.provincia ?? ""}
              placeholder="Buenos Aires"
              className={cls("provincia")}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="pais">
              País
            </label>
            <input
              id="pais"
              name="pais"
              type="text"
              defaultValue={initial?.pais ?? "Argentina"}
              className={cls("pais")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Descripción</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="descripcion_corta">
              Descripción corta
            </label>
            <textarea
              id="descripcion_corta"
              name="descripcion_corta"
              defaultValue={initial?.descripcion_corta ?? ""}
              maxLength={280}
              rows={2}
              placeholder="Pueblo costero rodeado de pinos, al sur de Villa Gesell."
              className={cls("descripcion_corta")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Hasta 280 caracteres. Aparece en el hub público.
            </p>
            {fe("descripcion_corta") && (
              <p className="mt-1 text-xs text-rose-600">{fe("descripcion_corta")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="descripcion_larga">
              Descripción larga
            </label>
            <textarea
              id="descripcion_larga"
              name="descripcion_larga"
              defaultValue={initial?.descripcion_larga ?? ""}
              maxLength={2000}
              rows={5}
              placeholder="Texto SEO largo, aparece en la portada del destino."
              className={cls("descripcion_larga")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Foto del destino</h2>
        <div className="mt-4">
          <label className="text-sm font-medium" htmlFor="foto_url">
            URL de la foto
          </label>
          <input
            id="foto_url"
            name="foto_url"
            type="url"
            defaultValue={initial?.foto_url ?? ""}
            placeholder="https://images.unsplash.com/photo-..."
            className={cls("foto_url")}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            URL externo de la foto que aparece en la tarjeta del destino. Si
            queda vacío, se muestra el degradado de biomas heredados de la
            región como fallback.
          </p>
          {fe("foto_url") && (
            <p className="mt-1 text-xs text-rose-600">{fe("foto_url")}</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg tracking-tight">Ubicación + ordenamiento</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <label className="text-sm font-medium" htmlFor="lat">
              Latitud
            </label>
            <input
              id="lat"
              name="lat"
              type="number"
              step="any"
              defaultValue={initial?.lat ?? ""}
              placeholder="-37.34"
              className={cls("lat")}
            />
            {fe("lat") && (
              <p className="mt-1 text-xs text-rose-600">{fe("lat")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="lng">
              Longitud
            </label>
            <input
              id="lng"
              name="lng"
              type="number"
              step="any"
              defaultValue={initial?.lng ?? ""}
              placeholder="-57.12"
              className={cls("lng")}
            />
            {fe("lng") && (
              <p className="mt-1 text-xs text-rose-600">{fe("lng")}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="orden">
              Orden
            </label>
            <input
              id="orden"
              name="orden"
              type="number"
              min={0}
              max={10000}
              defaultValue={initial?.orden ?? 0}
              className={cls("orden")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Menor = aparece primero.
            </p>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="activo"
                defaultChecked={initial?.activo ?? true}
                className="h-4 w-4 rounded border-input"
              />
              <span>Activo (visible al público)</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
