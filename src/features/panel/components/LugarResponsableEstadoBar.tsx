"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
  Send,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLugarForValidationAction } from "@/features/lugares/lib/actions";
import type { EstadoLugar } from "@/types/database";

interface Props {
  lugarId: string;
  estado: EstadoLugar;
  notasRechazo?: string | null;
}

const META: Record<
  EstadoLugar,
  {
    label: string;
    description: string;
    icon: typeof FileText;
    tone: string;
  }
> = {
  borrador: {
    label: "Borrador",
    description:
      "Estás cargando datos. Cuando esté listo, enviá a validación para que el admin lo apruebe.",
    icon: FileText,
    tone: "bg-slate-50 text-slate-700 border-slate-200",
  },
  pendiente_validacion: {
    label: "Pendiente de revisión",
    description:
      "El admin local lo está revisando. Te avisamos por mail cuando lo apruebe o pida ajustes.",
    icon: Clock,
    tone: "bg-amber-50 text-amber-800 border-amber-200",
  },
  publicado: {
    label: "Publicado",
    description:
      "Tu local ya aparece en el portal. Si modificás algo, vuelve a revisión automáticamente para que el admin lo re-valide.",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  pausado: {
    label: "Pausado",
    description:
      "El admin pausó la publicación. Contactalo si necesitás reactivarlo.",
    icon: Pause,
    tone: "bg-blue-50 text-blue-800 border-blue-200",
  },
  rechazado: {
    label: "Rechazado — necesita ajustes",
    description:
      "El admin pidió que corrijas algo. Revisá tu mail con el motivo, hacé los cambios y volvé a enviar a validación.",
    icon: XCircle,
    tone: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

export function LugarResponsableEstadoBar({ lugarId, estado, notasRechazo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const meta = META[estado];
  const Icon = meta.icon;
  const puedeEnviar = estado === "borrador" || estado === "rechazado";

  function enviar() {
    setError(null);
    startTransition(async () => {
      const r = await submitLugarForValidationAction(lugarId);
      if (r?.error) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section className={`rounded-xl border p-5 ${meta.tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-lg tracking-tight">{meta.label}</p>
            <p className="mt-1 max-w-md text-sm">{meta.description}</p>
          </div>
        </div>

        {puedeEnviar && (
          <Button onClick={enviar} disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar a validación
          </Button>
        )}
      </div>

      {estado === "rechazado" && notasRechazo && (
        <div className="mt-4 rounded border-l-4 border-rose-400 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Motivo del rechazo</p>
          <p className="mt-1 text-sm text-rose-900">{notasRechazo}</p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
    </section>
  );
}
