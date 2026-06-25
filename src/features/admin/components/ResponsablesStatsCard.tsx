import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import type { ResponsableStatsRow } from "@/features/admin/lib/responsable-management";

interface Props {
  responsables: ResponsableStatsRow[];
}

export function ResponsablesStatsCard({ responsables }: Props) {
  const conPendientes = responsables.filter((r) => r.comerciosPendiente > 0);

  if (conPendientes.length === 0) {
    return null;
  }

  const topResponsables = conPendientes.slice(0, 5);
  const totalPendientes = conPendientes.reduce(
    (sum, r) => sum + r.comerciosPendiente,
    0
  );

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h2 className="font-display text-lg tracking-tight">
            Responsables con pendientes
          </h2>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
          {totalPendientes} pendiente{totalPendientes !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {topResponsables.map((r) => (
          <a
            key={r.id}
            href={`/admin/responsables/${r.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.nombre || r.email}</p>
              <p className="text-xs text-muted-foreground">
                {r.totalComercios} comercio{r.totalComercios !== 1 ? "s" : ""} •{" "}
                {r.comerciosPublicados} publicado
                {r.comerciosPublicados !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-semibold text-amber-600">
                  {r.comerciosPendiente}
                </p>
                <p className="text-xs text-muted-foreground">pendiente</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>

      {conPendientes.length > 5 && (
        <p className="mt-3 text-xs text-muted-foreground">
          +{conPendientes.length - 5} responsable{conPendientes.length - 5 !== 1 ? "s" : ""} más con pendientes
        </p>
      )}

      <Link
        href="/admin/responsables"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Ver todos los responsables
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
