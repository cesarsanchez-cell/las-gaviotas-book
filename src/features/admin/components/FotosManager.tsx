"use client";

import * as React from "react";
import Image from "next/image";
import {
  Trash2,
  Star,
  StarOff,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getFotoUrl, validateImageFile } from "@/lib/storage";
import {
  registerFotoAction,
  deleteFotoAction,
  setPrincipalAction,
  updateFotoOrderAction,
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

  // Orden de presentación: la principal va siempre primero, el resto por `orden`.
  function sortServer(list: HospedajeFotoRow[]) {
    return [...list].sort((a, b) => {
      if (a.es_principal && !b.es_principal) return -1;
      if (!a.es_principal && b.es_principal) return 1;
      return a.orden - b.orden;
    });
  }

  // Estado local del orden (ids) para mover de forma optimista. Se resincroniza
  // solo cuando cambia la estructura (alta/baja/cambio de principal), no en cada
  // reordenamiento — así el movimiento se ve instantáneo.
  const [order, setOrder] = React.useState<string[]>(() =>
    sortServer(fotos).map((f) => f.id)
  );
  const principalId = fotos.find((f) => f.es_principal)?.id ?? "";
  const signature =
    fotos
      .map((f) => f.id)
      .sort()
      .join(",") +
    "|" +
    principalId;
  React.useEffect(() => {
    setOrder(sortServer(fotos).map((f) => f.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const byId = new Map(fotos.map((f) => [f.id, f]));
  const displayed: HospedajeFotoRow[] = order
    .map((id) => byId.get(id))
    .filter((f): f is HospedajeFotoRow => Boolean(f));
  for (const f of sortServer(fotos)) {
    if (!order.includes(f.id)) displayed.push(f);
  }

  async function move(i: number, dir: "left" | "right") {
    const j = dir === "left" ? i - 1 : i + 1;
    if (j < 0 || j >= displayed.length) return;
    // La principal queda fija primera: no se mueve ni se la pasa por encima.
    if (displayed[i].es_principal || displayed[j].es_principal) return;
    const newOrder = displayed.map((f) => f.id);
    [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    setOrder(newOrder);
    const res = await updateFotoOrderAction({
      hospedajeId,
      orderedIds: newOrder,
    });
    if (res.error) {
      setError(res.error);
      router.refresh();
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight">Fotos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}. La marcada
            como principal aparece en el card y como hero del detalle. Pasá el
            cursor sobre una foto y usá ◀ ▶ para ordenar la presentación.
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
          {displayed.map((foto, i) => {
            const canLeft = i > 0 && !foto.es_principal && !displayed[i - 1].es_principal;
            const canRight =
              i < displayed.length - 1 &&
              !foto.es_principal &&
              !displayed[i + 1].es_principal;
            return (
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
                {!foto.es_principal && (
                  <span className="absolute right-2 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1.5 text-[10px] font-medium text-white">
                    {i + 1}
                  </span>
                )}
                {foto.es_principal && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    <Star className="h-3 w-3" /> Principal
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/60 px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => move(i, "left")}
                    disabled={!canLeft}
                    className="inline-flex items-center text-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    title="Mover antes"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, "right")}
                    disabled={!canRight}
                    className="inline-flex items-center text-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                    title="Mover después"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
