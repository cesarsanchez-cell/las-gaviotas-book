"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Undo2, CheckCircle2, Clock, Pause, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  submitForReviewAction,
  withdrawFromReviewAction,
} from "@/features/panel/lib/hospedaje-actions";
import type { EstadoHospedaje } from "@/types/database";
import { cn } from "@/lib/utils";

interface EstadoControlsProps {
  hospedajeId: string;
  estado: EstadoHospedaje;
  canSubmit: boolean;
  missingCount: number;
  publicHref?: string;
  rejectionNote?: string | null;
}

export function EstadoControls({
  hospedajeId,
  estado,
  canSubmit,
  missingCount,
  publicHref,
  rejectionNote,
}: EstadoControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await submitForReviewAction(hospedajeId);
      if (res?.error) setError(res.error);
      if (res?.ok) {
        setOk("Enviado a revisión. El equipo lo va a revisar pronto.");
        router.refresh();
      }
    });
  }

  async function handleWithdraw() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const res = await withdrawFromReviewAction(hospedajeId);
      if (res?.error) setError(res.error);
      if (res?.ok) {
        setOk("Retirado de revisión. Volvió a borrador para que sigas editando.");
        router.refresh();
      }
    });
  }

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-6",
        estado === "publicado" && "border-emerald-200",
        estado === "pendiente_validacion" && "border-amber-200",
        estado === "rechazado" && "border-rose-200",
        estado === "pausado" && "border-blue-200"
      )}
    >
      {estado === "borrador" && (
        <BorradorState
          canSubmit={canSubmit}
          missingCount={missingCount}
          pending={pending}
          onSubmit={handleSubmit}
        />
      )}

      {estado === "pendiente_validacion" && (
        <PendienteState
          pending={pending}
          onWithdraw={handleWithdraw}
        />
      )}

      {estado === "publicado" && <PublicadoState publicHref={publicHref} />}

      {estado === "rechazado" && (
        <RechazadoState
          canSubmit={canSubmit}
          missingCount={missingCount}
          pending={pending}
          onSubmit={handleSubmit}
          note={rejectionNote}
        />
      )}

      {estado === "pausado" && <PausadoState />}

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      )}
    </section>
  );
}

function BorradorState(props: {
  canSubmit: boolean;
  missingCount: number;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h3 className="font-display text-lg tracking-tight">Borrador</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {props.canSubmit
            ? "Tu hospedaje está listo para enviar a revisión."
            : `Te faltan ${props.missingCount} ítems del checklist.`}
        </p>
      </div>
      <Button
        size="lg"
        disabled={!props.canSubmit || props.pending}
        onClick={props.onSubmit}
      >
        {props.pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Enviar a revisión
      </Button>
    </div>
  );
}

function PendienteState(props: { pending: boolean; onWithdraw: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Clock className="mt-1 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div>
          <h3 className="font-display text-lg tracking-tight">
            En revisión
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            El equipo de Las Gaviotas BOOK está revisando tu hospedaje. Cuando
            esté aprobado vas a recibir un email.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={props.pending}
        onClick={props.onWithdraw}
      >
        {props.pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Undo2 className="h-4 w-4" />
        )}
        Retirar de revisión
      </Button>
    </div>
  );
}

function PublicadoState({ publicHref }: { publicHref?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-1 h-5 w-5 shrink-0 text-emerald-600"
          aria-hidden
        />
        <div>
          <h3 className="font-display text-lg tracking-tight">Publicado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu hospedaje está visible en el sitio público.
          </p>
        </div>
      </div>
      {publicHref && (
        <a
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline"
        >
          Ver publicado →
        </a>
      )}
    </div>
  );
}

function RechazadoState(props: {
  canSubmit: boolean;
  missingCount: number;
  pending: boolean;
  onSubmit: () => void;
  note?: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <XCircle className="mt-1 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
        <div className="flex-1">
          <h3 className="font-display text-lg tracking-tight">
            Rechazado
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            El equipo pidió cambios. Corregí lo necesario y volvé a enviar a
            revisión.
          </p>
          {props.note && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <p className="text-xs font-medium uppercase tracking-wider text-rose-700">
                Notas del equipo
              </p>
              <p className="mt-1 whitespace-pre-line">{props.note}</p>
            </div>
          )}
        </div>
      </div>
      <Button
        size="lg"
        disabled={!props.canSubmit || props.pending}
        onClick={props.onSubmit}
      >
        {props.pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Volver a enviar a revisión
      </Button>
      {!props.canSubmit && (
        <p className="text-xs text-muted-foreground">
          Completá los {props.missingCount} ítems pendientes del checklist primero.
        </p>
      )}
    </div>
  );
}

function PausadoState() {
  return (
    <div className="flex items-start gap-3">
      <Pause className="mt-1 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
      <div>
        <h3 className="font-display text-lg tracking-tight">Pausado</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu hospedaje está pausado y no aparece en el sitio público.
        </p>
      </div>
    </div>
  );
}
