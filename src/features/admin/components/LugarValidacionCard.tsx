"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { changeEstadoLugarAction } from "@/features/lugares/lib/actions";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import { getFotoUrl } from "@/lib/storage";
import type { LugarRow, LugarFotoRow } from "@/types/database";

interface Props {
  lugar: LugarRow & {
    lugar_fotos: LugarFotoRow[];
    destinos: { slug: string; nombre: string };
    responsable_nombre: string | null;
  };
}

export function LugarValidacionCard({ lugar }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const principal =
    lugar.lugar_fotos.find((f) => f.es_principal) ?? lugar.lugar_fotos[0];
  const fotosCount = lugar.lugar_fotos.length;
  const tieneFotos = fotosCount > 0;
  const tieneWhatsapp = !!lugar.whatsapp;
  const tieneHorarios =
    !!lugar.horarios && Object.values(lugar.horarios).some((v) => !!v);

  // Mini checklist inline (no usamos el de hospedajes que es específico).
  const items: { label: string; ok: boolean }[] = [
    { label: "Al menos 1 foto", ok: tieneFotos },
    { label: "WhatsApp", ok: tieneWhatsapp },
    { label: "Horarios cargados", ok: tieneHorarios },
    { label: "Dirección", ok: !!lugar.direccion },
  ];
  const itemsFaltan = items.filter((i) => !i.ok);

  function approve() {
    setError(null);
    startTransition(async () => {
      const r = await changeEstadoLugarAction({
        id: lugar.id,
        estado: "publicado",
        notas: notas || undefined,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  function reject() {
    setError(null);
    if (!notas.trim()) {
      setError("Necesitás escribir el motivo del rechazo.");
      return;
    }
    startTransition(async () => {
      const r = await changeEstadoLugarAction({
        id: lugar.id,
        estado: "rechazado",
        notas,
      });
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-6 p-6 md:grid-cols-[280px_1fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          {principal ? (
            <Image
              src={getFotoUrl(principal.storage_path)}
              alt={principal.alt ?? lugar.nombre}
              fill
              sizes="280px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin fotos
            </div>
          )}
        </div>

        <div className="space-y-4">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Gastronómico</Badge>
              <Badge variant="secondary">
                {getCategoriaLabel("gastronomico", lugar.categoria) ?? lugar.categoria}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {lugar.destinos.nombre}
                {lugar.responsable_nombre && ` · ${lugar.responsable_nombre}`}
              </span>
            </div>
            <h3 className="mt-2 font-display text-2xl tracking-tight">
              {lugar.nombre}
            </h3>
            {lugar.direccion && (
              <p className="text-sm text-muted-foreground">{lugar.direccion}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {fotosCount} {fotosCount === 1 ? "foto" : "fotos"} · enviado{" "}
              {new Date(lugar.updated_at).toLocaleDateString("es-AR")}
            </p>
          </header>

          {itemsFaltan.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">
                  Faltan: {itemsFaltan.map((i) => i.label).join(", ")}
                </p>
                <p>
                  Podés aprobar igual o rechazar pidiendo que se completen.
                </p>
              </div>
            </div>
          )}

          <Link
            href={`/admin/gastronomia/${lugar.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Abrir en el editor
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 p-6">
        <h4 className="font-display text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Descripción
        </h4>
        <p className="mt-2 text-sm font-medium">{lugar.descripcion_corta}</p>
        {lugar.descripcion_larga && (
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
            {lugar.descripcion_larga}
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-6">
        <label className="block text-sm font-medium">
          Notas para el responsable{" "}
          <span className="font-normal text-muted-foreground">
            (obligatorio si rechazás)
          </span>
        </label>
        <Textarea
          rows={3}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: Sumá un par de fotos del salón y confirmá horarios de fin de semana."
          maxLength={500}
        />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={reject}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Rechazar
          </Button>
          <Button type="button" onClick={approve} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Aprobar y publicar
          </Button>
        </div>
      </div>
    </article>
  );
}
