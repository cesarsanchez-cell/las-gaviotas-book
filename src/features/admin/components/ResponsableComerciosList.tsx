"use client";

import {
  Building2,
  UtensilsCrossed,
  Compass,
  ExternalLink,
} from "lucide-react";
import type { ComercioConEstado } from "@/features/admin/lib/responsable-management";

interface Props {
  comercios: ComercioConEstado[];
}

const estadoConfig: Record<
  ComercioConEstado["estado"],
  { label: string; color: string }
> = {
  borrador: { label: "Borrador", color: "bg-slate-100 text-slate-900" },
  pendiente_validacion: {
    label: "Pendiente validación",
    color: "bg-yellow-100 text-yellow-900",
  },
  publicado: { label: "Publicado", color: "bg-emerald-100 text-emerald-900" },
  pausado: { label: "Pausado", color: "bg-blue-100 text-blue-900" },
  rechazado: { label: "Rechazado", color: "bg-rose-100 text-rose-900" },
};

function tipoIcon(tipo: ComercioConEstado["tipo"]) {
  switch (tipo) {
    case "hospedaje":
      return <Building2 className="h-4 w-4" />;
    case "gastronomico":
      return <UtensilsCrossed className="h-4 w-4" />;
    case "atractivo":
      return <Compass className="h-4 w-4" />;
  }
}

function tipoLabel(tipo: ComercioConEstado["tipo"]) {
  switch (tipo) {
    case "hospedaje":
      return "Hospedaje";
    case "gastronomico":
      return "Gastronómico";
    case "atractivo":
      return "Qué hacer";
  }
}

function editLink(tipo: ComercioConEstado["tipo"], id: string): string {
  switch (tipo) {
    case "hospedaje":
      return `/admin/hospedajes/${id}`;
    case "gastronomico":
      return `/admin/lugares/${id}?tipo=gastronomico`;
    case "atractivo":
      return `/admin/lugares/${id}?tipo=atractivo`;
  }
}

export function ResponsableComerciosList({ comercios }: Props) {
  if (comercios.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este responsable no tiene comercios asignados todavía.
      </p>
    );
  }

  // Agrupar por tipo
  const porTipo = {
    hospedaje: comercios.filter((c) => c.tipo === "hospedaje"),
    gastronomico: comercios.filter((c) => c.tipo === "gastronomico"),
    atractivo: comercios.filter((c) => c.tipo === "atractivo"),
  };

  return (
    <div className="space-y-6">
      {porTipo.hospedaje.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5 text-sky-600" />
            Hospedajes ({porTipo.hospedaje.length})
          </h3>
          <div className="space-y-2">
            {porTipo.hospedaje.map((c) => (
              <ComercioRow key={c.id} comercio={c} />
            ))}
          </div>
        </div>
      )}

      {porTipo.gastronomico.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
            Gastronómicos ({porTipo.gastronomico.length})
          </h3>
          <div className="space-y-2">
            {porTipo.gastronomico.map((c) => (
              <ComercioRow key={c.id} comercio={c} />
            ))}
          </div>
        </div>
      )}

      {porTipo.atractivo.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold">
            <Compass className="h-5 w-5 text-teal-600" />
            Qué hacer ({porTipo.atractivo.length})
          </h3>
          <div className="space-y-2">
            {porTipo.atractivo.map((c) => (
              <ComercioRow key={c.id} comercio={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ComercioRow({ comercio }: { comercio: ComercioConEstado }) {
  const config = estadoConfig[comercio.estado];
  const link = editLink(comercio.tipo, comercio.id);

  return (
    <a
      href={link}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition hover:bg-muted/40"
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="shrink-0 text-muted-foreground">
          {tipoIcon(comercio.tipo)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{comercio.nombre}</p>
          <p className="text-xs text-muted-foreground">{tipoLabel(comercio.tipo)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </div>
    </a>
  );
}
