"use client";

import * as React from "react";
import Image from "next/image";
import { Trash2, Star, StarOff, Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getFotoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  registerUnidadTypeFotoAction,
  deleteUnidadTypeFotoAction,
  setUnidadTypeFotoPrincipalAction,
  updateUnidadTypeFotoAltAction,
} from "@/features/unidades/lib/foto-actions";
import type { UnidadTypeFotoRow } from "@/types/database";

interface Props {
  unidadTypeId: string;
  fotos: UnidadTypeFotoRow[];
}

export function UnidadTypeFotosManager({ unidadTypeId, fotos }: Props) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editingAltId, setEditingAltId] = React.useState<string | null>(null);

  async function readImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = URL.createObjectURL(file);
    });
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

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const { width, height } = await readImageDimensions(file);
        const safeName = cleanFilename(file.name);
        // Prefijo unidad-types/ dentro del bucket compartido `hospedajes` para
        // mantener todo el storage del proyecto en un solo lugar.
        const path = `unidad-types/${unidadTypeId}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("hospedajes")
          .upload(path, file, { cacheControl: "31536000", upsert: false });

        if (upErr) {
          setError(`Error subiendo ${file.name}: ${upErr.message}`);
          continue;
        }

        const res = await registerUnidadTypeFotoAction({
          unidad_type_id: unidadTypeId,
          storage_path: path,
          width,
          height,
          alt: undefined,
        });
        if (res.error) {
          setError(`Subida ok pero error al registrar: ${res.error}`);
        }
      } catch (e) {
        setError(`Error procesando ${file.name}: ${(e as Error).message}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function onDelete(foto: UnidadTypeFotoRow) {
    if (!confirm("¿Borrar esta foto? La acción no se puede deshacer.")) return;
    const res = await deleteUnidadTypeFotoAction({
      fotoId: foto.id,
      unidadTypeId,
      storagePath: foto.storage_path,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onSetPrincipal(foto: UnidadTypeFotoRow) {
    const res = await setUnidadTypeFotoPrincipalAction({
      fotoId: foto.id,
      unidadTypeId,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onSaveAlt(foto: UnidadTypeFotoRow, alt: string) {
    const res = await updateUnidadTypeFotoAltAction({
      fotoId: foto.id,
      unidadTypeId,
      alt,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditingAltId(null);
    router.refresh();
  }

  const sortedFotos = [...fotos].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return a.orden - b.orden;
  });

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">Fotos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fotos.length === 0
              ? "Subí fotos de esta unidad — interior, exterior, vista, comodidades."
              : `${fotos.length} ${
                  fotos.length === 1 ? "foto cargada" : "fotos cargadas"
                }. La marcada como principal aparece en el card del listado y en la página pública.`}
          </p>
        </div>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90",
            uploading && "pointer-events-none opacity-70"
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Subiendo..." : "Subir fotos"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </header>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {fotos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sin fotos todavía. La primera que subas queda como principal.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sortedFotos.map((foto) => {
            const isEditingAlt = editingAltId === foto.id;
            return (
              <li
                key={foto.id}
                className={cn(
                  "group relative overflow-hidden rounded-md border bg-muted",
                  foto.es_principal && "ring-2 ring-primary"
                )}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={getFotoUrl(foto.storage_path)}
                    alt={foto.alt ?? ""}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                  {foto.es_principal && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      <Star className="h-3 w-3" /> Principal
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                    {!foto.es_principal && (
                      <button
                        type="button"
                        onClick={() => onSetPrincipal(foto)}
                        className="inline-flex items-center gap-1 text-xs text-white hover:text-amber-300"
                        title="Marcar como principal"
                      >
                        <StarOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(foto)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-white hover:text-rose-300"
                      title="Borrar foto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {/* Alt text — descripción breve para accesibilidad y SEO */}
                <div className="bg-background p-2">
                  {isEditingAlt ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        onSaveAlt(foto, String(fd.get("alt") ?? ""));
                      }}
                      className="flex gap-1"
                    >
                      <input
                        name="alt"
                        type="text"
                        defaultValue={foto.alt ?? ""}
                        autoFocus
                        maxLength={200}
                        placeholder="Vista del living"
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                      />
                      <button
                        type="submit"
                        className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingAltId(foto.id)}
                      className="block w-full truncate text-left text-xs text-muted-foreground hover:text-foreground"
                      title="Editar descripción"
                    >
                      {foto.alt ?? "Agregar descripción..."}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
