import Link from "next/link";
import { requireResponsable } from "@/features/panel/lib/auth";
import {
  listConsultasResponsable,
  getConsultasStatsResponsable,
  enrichConsultasConDisponibilidad,
} from "@/features/consultas/lib/queries";
import { ConsultaCard } from "@/features/consultas/components/ConsultaCard";
import type { EstadoConsulta } from "@/types/database";
import { cn } from "@/lib/utils";

const ESTADO_TABS: Array<{
  value: EstadoConsulta | "all";
  label: string;
  statKey: keyof Awaited<ReturnType<typeof getConsultasStatsResponsable>>;
}> = [
  { value: "all", label: "Todas", statKey: "total" },
  { value: "nueva", label: "Nuevas", statKey: "nuevas" },
  { value: "leida", label: "Leídas", statKey: "leidas" },
  { value: "respondida", label: "Respondidas", statKey: "respondidas" },
  { value: "descartada", label: "Descartadas", statKey: "descartadas" },
];

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function PanelLeadsPage({ searchParams }: PageProps) {
  await requireResponsable();
  const sp = await searchParams;
  const estadoFilter = (
    ESTADO_TABS.some((t) => t.value === sp.estado) ? sp.estado : undefined
  ) as EstadoConsulta | undefined;

  const [consultasRaw, stats] = await Promise.all([
    listConsultasResponsable({ estado: estadoFilter ?? null }),
    getConsultasStatsResponsable(),
  ]);
  const consultas = await enrichConsultasConDisponibilidad(consultasRaw);

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Consultas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Huéspedes que preguntaron por tus hospedajes. Respondé directo por mail
          o WhatsApp y marcá la consulta como respondida para que no te quede
          dando vueltas.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {ESTADO_TABS.map((t) => {
          const active =
            (t.value === "all" && !estadoFilter) || t.value === estadoFilter;
          const href =
            t.value === "all"
              ? "/panel/leads"
              : `/panel/leads?estado=${t.value}`;
          const count = stats[t.statKey];
          return (
            <Link
              key={t.value}
              href={href}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition",
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      {consultas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-display text-xl">
            {estadoFilter
              ? `No hay consultas en estado "${estadoFilter}"`
              : "Todavía no recibiste consultas"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {estadoFilter
              ? "Probá otra pestaña."
              : "Cuando un huésped pregunte por uno de tus hospedajes, te va a llegar el aviso por mail y va a aparecer acá."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultas.map((c) => (
            <ConsultaCard key={c.id} consulta={c} mode="responsable" />
          ))}
        </div>
      )}
    </div>
  );
}
