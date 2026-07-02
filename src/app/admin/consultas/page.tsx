import Link from "next/link";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listConsultasAdmin,
  getConsultasStats,
  enrichConsultasConDisponibilidad,
} from "@/features/consultas/lib/queries";
import { ConsultaCard } from "@/features/consultas/components/ConsultaCard";
import type { EstadoConsulta } from "@/types/database";
import { cn } from "@/lib/utils";

const ESTADO_TABS: Array<{
  value: EstadoConsulta | "all";
  label: string;
  statKey: keyof Awaited<ReturnType<typeof getConsultasStats>>;
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

export default async function AdminConsultasPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const estadoFilter = (
    ESTADO_TABS.some((t) => t.value === sp.estado) ? sp.estado : undefined
  ) as EstadoConsulta | undefined;

  const [consultasRaw, stats] = await Promise.all([
    listConsultasAdmin({
      destinoId: admin.destinoId,
      estado: estadoFilter ?? null,
    }),
    getConsultasStats(admin.destinoId),
  ]);
  const consultas = await enrichConsultasConDisponibilidad(consultasRaw);

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Consultas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bandeja de consultas recibidas en hospedajes
          {admin.isSuperAdmin ? " de toda la red" : " de tu destino"}.
        </p>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {ESTADO_TABS.map((t) => {
          const active =
            (t.value === "all" && !estadoFilter) || t.value === estadoFilter;
          const href =
            t.value === "all"
              ? "/admin/consultas"
              : `/admin/consultas?estado=${t.value}`;
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
              : "No hay consultas todavía"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {estadoFilter
              ? "Probá otra pestaña."
              : "Cuando un huésped mande una consulta desde la página pública del hospedaje, va a aparecer acá."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {consultas.map((c) => (
            <ConsultaCard key={c.id} consulta={c} mode="admin-view" />
          ))}
        </div>
      )}
    </div>
  );
}
