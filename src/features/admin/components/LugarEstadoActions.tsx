"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Pause, Play, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  changeEstadoLugarAction,
  deleteLugarAction,
} from "@/features/lugares/lib/actions";
import type { EstadoLugar } from "@/types/database";

interface Props {
  lugarId: string;
  estadoActual: EstadoLugar;
  tipo: "gastronomico" | "atractivo";
  listadoPath: string;
}

const ESTADO_LABEL: Record<EstadoLugar, string> = {
  borrador: "Borrador",
  pendiente_validacion: "Pendiente",
  publicado: "Publicado",
  pausado: "Pausado",
  rechazado: "Rechazado",
};

const ESTADO_CLASS: Record<EstadoLugar, string> = {
  borrador: "bg-slate-100 text-slate-700",
  pendiente_validacion: "bg-amber-100 text-amber-800",
  publicado: "bg-emerald-100 text-emerald-800",
  pausado: "bg-blue-100 text-blue-800",
  rechazado: "bg-rose-100 text-rose-800",
};

export function LugarEstadoActions({
  lugarId,
  estadoActual,
  tipo,
  listadoPath,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [showRechazo, setShowRechazo] = React.useState(false);
  const [motivo, setMotivo] = React.useState("");

  function transition(estado: EstadoLugar, notas?: string) {
    setError(null);
    startTransition(async () => {
      const r = await changeEstadoLugarAction({ id: lugarId, estado, notas });
      if (r?.error) setError(r.error);
      else {
        setShowRechazo(false);
        setMotivo("");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar este ${tipo === "gastronomico" ? "gastronómico" : "atractivo"}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await deleteLugarAction(lugarId);
      if (r?.error) setError(r.error);
      // El delete redirige al listado vía server action.
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Estado actual</p>
          <span
            className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${ESTADO_CLASS[estadoActual]}`}
          >
            {ESTADO_LABEL[estadoActual]}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {estadoActual !== "publicado" && (
            <Button
              size="sm"
              onClick={() => transition("publicado")}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Publicar
            </Button>
          )}

          {estadoActual === "publicado" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => transition("pausado")}
              disabled={pending}
            >
              <Pause className="h-4 w-4" />
              Pausar
            </Button>
          )}

          {estadoActual === "pausado" && (
            <Button
              size="sm"
              onClick={() => transition("publicado")}
              disabled={pending}
            >
              <Play className="h-4 w-4" />
              Reactivar
            </Button>
          )}

          {estadoActual !== "rechazado" && estadoActual !== "publicado" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRechazo((v) => !v)}
              disabled={pending}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </Button>
          )}

          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {showRechazo && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <Label htmlFor="motivo">Motivo del rechazo</Label>
          <Textarea
            id="motivo"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="¿Qué tiene que ajustar el responsable para que se pueda publicar?"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRechazo(false);
                setMotivo("");
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => transition("rechazado", motivo || undefined)}
              disabled={pending || motivo.trim().length < 5}
            >
              Confirmar rechazo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Le mandamos un mail al responsable con el motivo (si el comercio
            tiene uno asignado).
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Cualquier transición se guarda inmediatamente. Tu cambio de fechas y
        datos requiere el botón &laquo;Guardar&raquo; del formulario de abajo.
      </p>

      <input type="hidden" value={listadoPath} />
    </div>
  );
}
