"use client";

import * as React from "react";
import Image from "next/image";
import { Trash2, Star, StarOff, Upload, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getFotoUrl, validateImageFile } from "@/lib/storage";
import {
  registerFotoAction,
  deleteFotoAction,
  setPrincipalAction,
} from "@/features/admin/lib/foto-actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HospedajeFotoRow } from "@/types/database";

interface FotosManagerProps {
  hospedajeId: string;
  fotos: HospedajeFotoRow[];
}

export function FotosManager({ hospedajeId, fotos }: FotosManagerProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      const invalid = validateImageFile(file);
      if (invalid) {
        setError(invalid);
        continue;
      }
      try {
        const { width, height } = await readImageDimensions(file);
        const safeName = cleanFilename(file.name);
        const path = `${hospedajeId}/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("hospedajes")
          .upload(path, file, { cacheControl: "31536000", upsert: false });

        if (upErr) {
          setError(`Error subiendo ${file.name}: ${upErr.message}`);
          continue;
        }

        const res = await registerFotoAction({
          hospedaje_id: hospedajeId,
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

  async function onDelete(foto: HospedajeFotoRow) {
    if (!confirm("¿Borrar esta foto? La acción no se puede deshacer.")) return;
    const res = await deleteFotoAction({
      fotoId: foto.id,
      hospedajeId,
      storagePath: foto.storage_path,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function onSetPrincipal(foto: HospedajeFotoRow) {
    const res = await setPrincipalAction({
      fotoId: foto.id,
      hospedajeId,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const sortedFotos = [...fotos].sort((a, b) => {
    if (a.es_principal && !b.es_principal) return -1;
    if (!a.es_principal && b.es_principal) return 1;
    return a.orden - b.orden;
  });

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight">Fotos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}. La marcada
            como principal aparece en el card y como hero del detalle.
          </p>
        </div>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90",
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
          Sin fotos todavía. Subí al menos una para poder publicar el hospedaje.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sortedFotos.map((foto) => (
            <li
              key={foto.id}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-md border bg-muted",
                foto.es_principal && "ring-2 ring-primary"
              )}
            >
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
