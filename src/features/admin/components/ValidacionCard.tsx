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
import { Checklist } from "@/features/panel/components/Checklist";
import {
  evaluateChecklist,
  checklistPasses,
} from "@/features/panel/lib/checklist";
import {
  approveHospedajeAction,
  rejectHospedajeAction,
} from "@/features/admin/lib/validation-actions";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import { getFotoUrl } from "@/lib/storage";
import type { HospedajeFotoRow, HospedajeRow } from "@/types/database";

interface ValidacionCardProps {
  hospedaje: HospedajeRow & {
    hospedaje_fotos: HospedajeFotoRow[];
    destinos: { slug: string; nombre: string };
  };
}

export function ValidacionCard({ hospedaje }: ValidacionCardProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [notas, setNotas] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const items = evaluateChecklist(hospedaje, hospedaje.hospedaje_fotos);
  const checklistOk = checklistPasses(items);

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveHospedajeAction(hospedaje.id, notas);
      if (res?.error) setError(res.error);
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
      const res = await rejectHospedajeAction(hospedaje.id, notas);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  const principal =
    hospedaje.hospedaje_fotos.find((f) => f.es_principal) ??
    hospedaje.hospedaje_fotos[0];

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid gap-6 p-6 md:grid-cols-[280px_1fr]">
        {/* Foto principal */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          {principal ? (
            <Image
              src={getFotoUrl(principal.storage_path)}
              alt={principal.alt ?? hospedaje.nombre}
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

        {/* Resumen + acciones */}
        <div className="space-y-4">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {TIPO_HOSPEDAJE_LABEL[hospedaje.tipo]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {hospedaje.destinos.nombre} · {hospedaje.responsable_nombre}
              </span>
            </div>
            <h3 className="mt-2 font-display text-2xl tracking-tight">
              {hospedaje.nombre}
            </h3>
            <p className="text-sm text-muted-foreground">{hospedaje.direccion}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hospedaje.hospedaje_fotos.length} fotos · enviado{" "}
              {new Date(hospedaje.updated_at).toLocaleDateString("es-AR")}
            </p>
          </header>

          {!checklistOk && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">El checklist tiene ítems sin completar</p>
                <p>
                  Podés aprobar igual si considerás que está OK, o rechazar y
                  pedirle al responsable que corrija.
                </p>
              </div>
            </div>
          )}

          <Link
            href={`/admin/hospedajes/${hospedaje.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Editar como admin
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Checklist + descripción */}
      <div className="grid gap-6 border-t border-border bg-muted/30 p-6 md:grid-cols-2">
        <Checklist items={items} />

        <div className="rounded-xl border border-border bg-card p-6">
          <h4 className="font-display text-lg tracking-tight">
            Descripción del hospedaje
          </h4>
          <p className="mt-3 text-sm font-medium text-foreground">
            {hospedaje.descripcion_corta}
          </p>
          {hospedaje.descripcion_larga && (
            <p className="mt-3 line-clamp-6 whitespace-pre-line text-sm text-muted-foreground">
              {hospedaje.descripcion_larga}
            </p>
          )}
        </div>
      </div>

      {/* Acciones */}
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
          placeholder="Ej: Las fotos del baño tienen baja resolución, ¿podés subir nuevas?"
          maxLength={2000}
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
