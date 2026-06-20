"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Upload, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { ZonaRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type {
  OpcionDestino,
  OpcionCurador,
} from "@/features/admin/lib/zona-management";
import {
  setZonaFotoAction,
  deleteZonaFotoAction,
} from "@/features/admin/lib/zona-management";
import { createClient } from "@/lib/supabase/client";
import { getZonaFotoUrl, validateImageFile } from "@/lib/storage";

function cleanFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface ZonaFormProps {
  zona?: ZonaRow;
  selectedDestinoIds?: string[];
  destinos: OpcionDestino[];
  ciudades: Array<{ id: string; nombre: string }>;
  curadores: OpcionCurador[];
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}

export function ZonaForm({
  zona,
  selectedDestinoIds = [],
  destinos,
  ciudades,
  curadores,
  action,
  submitLabel,
}: ZonaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState(zona?.nombre ?? "");
  const [slug, setSlug] = useState(zona?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(Boolean(zona?.slug));
  const [fotoPath, setFotoPath] = useState<string | null>(zona?.foto_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  const selected = new Set(selectedDestinoIds);

  async function handleFotoUpload(file: File) {
    if (!zona?.id) {
      setFotoError("Guardá la zona primero para poder subir la foto.");
      return;
    }
    const invalid = validateImageFile(file);
    if (invalid) {
      setFotoError(invalid);
      return;
    }
    setFotoError(null);
    setUploading(true);
    try {
      const sb = createClient();
      const path = `zonas/${zona.id}/${Date.now()}-${cleanFilename(file.name)}`;
      const { error: upErr } = await sb.storage
        .from("destinos")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) {
        setFotoError(`Error al subir: ${upErr.message}`);
        return;
      }
      const res = await setZonaFotoAction(zona.id, path);
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
    if (!zona?.id || !fotoPath) return;
    if (!confirm("¿Borrar la foto de la zona?")) return;
    const res = await deleteZonaFotoAction(zona.id);
    if (res.error) {
      setFotoError(res.error);
      return;
    }
    setFotoPath(null);
  }

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
          <label className="text-sm font-medium" htmlFor="zona-nombre">
            Nombre <span className="text-rose-600">*</span>
          </label>
          <input
            id="zona-nombre"
            name="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugDirty) setSlug(slugify(e.target.value));
            }}
            placeholder="Pueblos del bosque"
            className={inputBase}
          />
          {fe("nombre") && (
            <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="zona-slug">
            Slug <span className="text-rose-600">*</span>
          </label>
          <input
            id="zona-slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            placeholder="pueblos-del-bosque"
            className={`${inputBase} font-mono`}
          />
          {fe("slug") && (
            <p className="mt-1 text-xs text-rose-600">{fe("slug")}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="zona-desc">
          Descripción
        </label>
        <textarea
          id="zona-desc"
          name="descripcion"
          rows={2}
          defaultValue={zona?.descripcion ?? ""}
          maxLength={400}
          placeholder="El cordón de pinares al sur de Gesell…"
          className={`${inputBase} resize-none`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="zona-ciudad">
            Ciudad
          </label>
          <select
            id="zona-ciudad"
            name="ciudad_id"
            defaultValue={zona?.ciudad_id ?? ""}
            className={inputBase}
          >
            <option value="">— Sin ciudad —</option>
            {ciudades.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            La zona vive dentro de esta ciudad (opcional).
          </p>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="zona-curador">
            Curador
          </label>
          <select
            id="zona-curador"
            name="curador_id"
            defaultValue={zona?.curador_id ?? ""}
            className={inputBase}
          >
            <option value="">— Solo super admin —</option>
            {curadores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Admin que podrá gestionar las atracciones de la zona.
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Destinos de la zona</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          El conglomerado: qué destinos comparten estas atracciones.
        </p>
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2 md:grid-cols-3">
          {destinos.map((d) => (
            <label
              key={d.id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="destino_ids"
                value={d.id}
                defaultChecked={selected.has(d.id)}
                className="h-4 w-4 rounded border-input"
              />
              {d.nombre}
            </label>
          ))}
        </div>
        {destinos.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No hay destinos cargados todavía.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="zona-orden">
            Orden
          </label>
          <input
            id="zona-orden"
            name="orden"
            type="number"
            min={0}
            max={10000}
            defaultValue={zona?.orden ?? 0}
            className={inputBase}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={zona?.activo ?? true}
              className="h-4 w-4 rounded border-input"
            />
            Activa
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Foto de la zona</p>
        {!zona?.id ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Guardá la zona primero y vas a poder subirle una foto (para la landing
            de la zona, Fase 5).
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {fotoPath ? (
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getZonaFotoUrl(fotoPath)}
                  alt={`Foto de ${zona.nombre || "la zona"}`}
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
                <span>{uploading ? "Subiendo…" : "Subí una foto (JPG/PNG)"}</span>
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
            {fotoError && <p className="text-xs text-rose-600">{fotoError}</p>}
          </div>
        )}
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
