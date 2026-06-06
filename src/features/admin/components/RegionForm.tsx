"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Upload, Trash2 } from "lucide-react";
import type { Bioma, RegionRow } from "@/types/database";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import { createClient } from "@/lib/supabase/client";
import { getRegionFotoUrl, validateImageFile } from "@/lib/storage";
import {
  setRegionFotoAction,
  deleteRegionFotoAction,
} from "@/features/admin/lib/region-management";

function cleanFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const BIOMAS: Array<{ value: Bioma; label: string; color: string }> = [
  { value: "playa", label: "Playa", color: "hsl(var(--bioma-playa))" },
  { value: "bosque", label: "Bosque", color: "hsl(var(--bioma-bosque))" },
  { value: "montana", label: "Montaña", color: "hsl(var(--bioma-montana))" },
  { value: "sierra", label: "Sierra", color: "hsl(var(--bioma-sierra))" },
  { value: "lago", label: "Lago", color: "hsl(var(--bioma-lago))" },
  { value: "desierto", label: "Desierto", color: "hsl(var(--bioma-desierto))" },
];

interface RegionFormProps {
  region?: RegionRow;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}

export function RegionForm({ region, action, submitLabel }: RegionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedBiomas, setSelectedBiomas] = useState<Set<Bioma>>(
    new Set(region?.biomas ?? [])
  );
  const [fotoPath, setFotoPath] = useState<string | null>(
    region?.foto_path ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  async function handleFotoUpload(file: File) {
    if (!region?.id) {
      setFotoError(
        "Guardá la región primero (con nombre y slug) para poder subir la foto."
      );
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
      const safeName = cleanFilename(file.name);
      const path = `regiones/${region.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await sb.storage
        .from("destinos")
        .upload(path, file, { cacheControl: "31536000", upsert: false });
      if (upErr) {
        setFotoError(`Error al subir: ${upErr.message}`);
        return;
      }
      const res = await setRegionFotoAction(region.id, path);
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
    if (!region?.id || !fotoPath) return;
    if (!confirm("¿Borrar la foto de la región?")) return;
    setFotoError(null);
    const res = await deleteRegionFotoAction(region.id);
    if (res.error) {
      setFotoError(res.error);
      return;
    }
    setFotoPath(null);
  }

  function toggleBioma(b: Bioma) {
    setSelectedBiomas((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else if (next.size < 3) next.add(b);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    // Re-inyectar biomas seleccionados (controlled chips).
    formData.delete("biomas");
    for (const b of selectedBiomas) formData.append("biomas", b);

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

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="reg-nombre">
            Nombre <span className="text-rose-600">*</span>
          </label>
          <input
            id="reg-nombre"
            name="nombre"
            type="text"
            required
            defaultValue={region?.nombre ?? ""}
            placeholder="Costa Atlántica Bonaerense"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {fieldErrors.nombre && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.nombre}</p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="reg-slug">
            Slug <span className="text-rose-600">*</span>
          </label>
          <input
            id="reg-slug"
            name="slug"
            type="text"
            required
            defaultValue={region?.slug ?? ""}
            placeholder="costa-atlantica-bonaerense"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            URL pública: <code>/regiones/{region?.slug ?? "[slug]"}</code>
          </p>
          {fieldErrors.slug && (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.slug}</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="reg-desc">
          Descripción
        </label>
        <textarea
          id="reg-desc"
          name="descripcion"
          rows={3}
          defaultValue={region?.descripcion ?? ""}
          maxLength={300}
          placeholder="Pinares al borde del Atlántico. Pueblos chicos, mar abierto..."
          className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Máximo 300 caracteres. Aparece debajo del nombre en la card de la home.
        </p>
        {fieldErrors.descripcion && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.descripcion}</p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium">
          Biomas dominantes <span className="text-rose-600">*</span>
          <span className="ml-2 font-normal text-muted-foreground">
            ({selectedBiomas.size}/3) — primer click = bioma principal
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BIOMAS.map((b) => {
            const selected = selectedBiomas.has(b.value);
            return (
              <button
                type="button"
                key={b.value}
                onClick={() => toggleBioma(b.value)}
                disabled={!selected && selectedBiomas.size >= 3}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40"
                style={
                  selected
                    ? { backgroundColor: b.color, color: "white", borderColor: b.color }
                    : { backgroundColor: "transparent", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" }
                }
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                {b.label}
              </button>
            );
          })}
        </div>
        {fieldErrors.biomas && (
          <p className="mt-1 text-xs text-rose-600">{fieldErrors.biomas}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium" htmlFor="reg-pais">
            País
          </label>
          <input
            id="reg-pais"
            name="pais"
            type="text"
            defaultValue={region?.pais ?? "Argentina"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="reg-orden">
            Orden
          </label>
          <input
            id="reg-orden"
            name="orden"
            type="number"
            min={0}
            max={10000}
            defaultValue={region?.orden ?? 0}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={region?.activo ?? true}
              className="h-4 w-4 rounded border-input"
            />
            Activa
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="destacado"
              defaultChecked={region?.destacado ?? false}
              className="h-4 w-4 rounded border-input"
            />
            Destacada
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium">Foto de la región</p>
        {!region?.id ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Guardá la región primero y vas a poder subirle una foto desde acá.
            Sin foto, el hero de la región usa el degradado de biomas.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {fotoPath ? (
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getRegionFotoUrl(fotoPath)}
                  alt={`Foto de ${region.nombre || "la región"}`}
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
                    : "Subí una foto de la región (JPG/PNG)"}
                </span>
                <span className="text-xs">
                  Aparece como fondo del hero en la página de la región.
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
