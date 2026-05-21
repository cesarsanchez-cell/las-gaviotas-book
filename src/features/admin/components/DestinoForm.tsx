"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Upload, Trash2 } from "lucide-react";
import type { DestinoRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getDestinoFotoUrl } from "@/lib/storage";
import {
  setDestinoFotoAction,
  deleteDestinoFotoAction,
} from "@/features/admin/lib/destino-management";

interface Props {
  initial?: DestinoRow;
  submitLabel: string;
  action: (formData: FormData) => Promise<ActionResult>;
}

function cleanFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  const [fotoPath, setFotoPath] = useState<string | null>(
    initial?.foto_path ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  async function handleFotoUpload(file: File) {
    if (!initial?.id) {
      setFotoError(
        "Guardá el destino primero (con nombre y slug) para poder subir la foto."
      );
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFotoError("El archivo debe ser una imagen.");
      return;
    }
    setFotoError(null);
    setUploading(true);
    try {
      const sb = createClient();
      const safeName = cleanFilename(file.name);
      const path = `${initial.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await sb.storage
        .from("destinos")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) {
        setFotoError(`Error al subir: ${upErr.message}`);
        return;
      }
      const res = await setDestinoFotoAction(initial.id, path);
      if (res.error) {
        setFotoError(res.error);
        return;
      }
      setFotoPath(path);
    } finally {
      setUploading(false);
    }
  }

  async function handleFotoDelete() {
    if (!initial?.id || !fotoPath) return;
    if (!confirm("¿Borrar la foto del destino?")) return;
    setFotoError(null);
    const res = await deleteDestinoFotoAction(initial.id);
    if (res.error) {
      setFotoError(res.error);
      return;
    }
    setFotoPath(null);
  }

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
        {!initial?.id ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Una vez que crees el destino vas a poder subirle una foto desde
            esta sección. Mientras tanto, las tarjetas usan el degradado de
            biomas heredados de la región.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {fotoPath ? (
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getDestinoFotoUrl(fotoPath)}
                  alt={`Foto de ${nombre || "destino"}`}
                  className="h-40 w-60 rounded-lg border border-border object-cover"
                />
                <div className="flex flex-col gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-secondary">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Reemplazar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFotoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleFotoDelete}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Borrar foto
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background/50 px-6 py-10 text-center text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-secondary/40">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
                <span>
                  {uploading
                    ? "Subiendo…"
                    : "Subí una foto del destino (JPG/PNG)"}
                </span>
                <span className="text-xs">
                  Cuando no hay foto, las cards usan el degradado de biomas.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFotoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {fotoError && (
              <p className="text-xs text-rose-600">{fotoError}</p>
            )}
          </div>
        )}
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
