"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Upload, Trash2 } from "lucide-react";
import { slugify } from "@/lib/utils";
import type { AtraccionRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { ZonaConDestinos } from "@/features/admin/lib/atraccion-management";
import {
  setAtraccionFotoAction,
  deleteAtraccionFotoAction,
} from "@/features/admin/lib/atraccion-management";
import { createClient } from "@/lib/supabase/client";
import { getAtraccionFotoUrl, validateImageFile } from "@/lib/storage";

function cleanFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface AtraccionFormProps {
  atraccion?: AtraccionRow;
  zonas: ZonaConDestinos[];
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}

export function AtraccionForm({
  atraccion,
  zonas,
  action,
  submitLabel,
}: AtraccionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState(atraccion?.nombre ?? "");
  const [slug, setSlug] = useState(atraccion?.slug ?? "");
  const [slugDirty, setSlugDirty] = useState(Boolean(atraccion?.slug));
  const [zonaId, setZonaId] = useState(
    atraccion?.zona_id ?? zonas[0]?.id ?? ""
  );
  const [fotoPath, setFotoPath] = useState<string | null>(
    atraccion?.foto_path ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  const anclaOpciones = useMemo(
    () => zonas.find((z) => z.id === zonaId)?.destinos ?? [],
    [zonas, zonaId]
  );

  async function handleFotoUpload(file: File) {
    if (!atraccion?.id) {
      setFotoError("Guardá la atracción primero para poder subir la foto.");
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
      const path = `atracciones/${atraccion.id}/${Date.now()}-${cleanFilename(file.name)}`;
      const { error: upErr } = await sb.storage
        .from("destinos")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) {
        setFotoError(`Error al subir: ${upErr.message}`);
        return;
      }
      const res = await setAtraccionFotoAction(atraccion.id, path);
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
    if (!atraccion?.id || !fotoPath) return;
    if (!confirm("¿Borrar la foto de la atracción?")) return;
    const res = await deleteAtraccionFotoAction(atraccion.id);
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

  if (zonas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay zonas que puedas curar. Pedile a un super admin que cree una zona
        y te asigne como curador.
      </p>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="atr-nombre">
            Nombre <span className="text-rose-600">*</span>
          </label>
          <input
            id="atr-nombre"
            name="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!slugDirty) setSlug(slugify(e.target.value));
            }}
            placeholder="Playas amplias y médanos"
            className={inputBase}
          />
          {fe("nombre") && (
            <p className="mt-1 text-xs text-rose-600">{fe("nombre")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="atr-slug">
            Slug <span className="text-rose-600">*</span>
          </label>
          <input
            id="atr-slug"
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            placeholder="playas-amplias"
            className={`${inputBase} font-mono`}
          />
          {fe("slug") && (
            <p className="mt-1 text-xs text-rose-600">{fe("slug")}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="atr-desc">
          Descripción
        </label>
        <textarea
          id="atr-desc"
          name="descripcion"
          rows={3}
          defaultValue={atraccion?.descripcion ?? ""}
          maxLength={1000}
          placeholder="Kilómetros de playa abierta entre el pinar y el mar…"
          className={`${inputBase} resize-none`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="atr-zona">
            Zona <span className="text-rose-600">*</span>
          </label>
          <select
            id="atr-zona"
            name="zona_id"
            required
            value={zonaId}
            onChange={(e) => setZonaId(e.target.value)}
            className={inputBase}
          >
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
          {fe("zona_id") && (
            <p className="mt-1 text-xs text-rose-600">{fe("zona_id")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="atr-ancla">
            Destino ancla
          </label>
          <select
            id="atr-ancla"
            name="destino_ancla_id"
            defaultValue={atraccion?.destino_ancla_id ?? ""}
            key={zonaId}
            className={inputBase}
          >
            <option value="">— Toda la zona —</option>
            {anclaOpciones.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Si se concentra en un destino de la zona.
          </p>
          {fe("destino_ancla_id") && (
            <p className="mt-1 text-xs text-rose-600">{fe("destino_ancla_id")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="atr-categoria">
            Categoría
          </label>
          <input
            id="atr-categoria"
            name="categoria"
            type="text"
            defaultValue={atraccion?.categoria ?? ""}
            placeholder="Naturaleza, Cultura, Evento…"
            className={inputBase}
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="atr-ubic">
          Ubicación (texto)
        </label>
        <input
          id="atr-ubic"
          name="ubicacion_texto"
          type="text"
          defaultValue={atraccion?.ubicacion_texto ?? ""}
          placeholder="Anfiteatro de Mar de las Pampas"
          className={inputBase}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="atr-desde">
            Vigencia desde
          </label>
          <input
            id="atr-desde"
            name="vigencia_desde"
            type="date"
            defaultValue={atraccion?.vigencia_desde ?? ""}
            className={inputBase}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="atr-hasta">
            Vigencia hasta
          </label>
          <input
            id="atr-hasta"
            name="vigencia_hasta"
            type="date"
            defaultValue={atraccion?.vigencia_hasta ?? ""}
            className={inputBase}
          />
          {fe("vigencia_hasta") && (
            <p className="mt-1 text-xs text-rose-600">{fe("vigencia_hasta")}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="atr-orden">
            Orden
          </label>
          <input
            id="atr-orden"
            name="orden"
            type="number"
            min={0}
            max={10000}
            defaultValue={atraccion?.orden ?? 0}
            className={inputBase}
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        Sin fechas = permanente (playa, bosque). Con fechas = evento; se baja del
        hero al vencer.
      </p>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="publicada"
            defaultChecked={atraccion?.publicada ?? false}
            className="h-4 w-4 rounded border-input"
          />
          Publicada
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="destacada"
            defaultChecked={atraccion?.destacada ?? false}
            className="h-4 w-4 rounded border-input"
          />
          Destacada (prioridad en el hero)
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Foto de la atracción</p>
        {!atraccion?.id ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Guardá la atracción primero y vas a poder subirle la foto (la que usa
            el hero).
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {fotoPath ? (
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getAtraccionFotoUrl(fotoPath)}
                  alt={`Foto de ${atraccion.nombre || "la atracción"}`}
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
