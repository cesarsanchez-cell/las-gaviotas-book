import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { PromoAdminRow } from "@/features/promos/lib/queries";
import type { ComercioTipo } from "@/types/database";

const TIPO_LABEL: Record<ComercioTipo, string> = {
  hospedaje: "Hospedaje",
  gastronomico: "Gastronomía",
  atractivo: "Atractivo",
};

function vigenciaLabel(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return "Sin límite";
  const fmt = (s: string) =>
    new Date(s + "T00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  if (desde && hasta) return `${fmt(desde)} → ${fmt(hasta)}`;
  if (hasta) return `hasta ${fmt(hasta)}`;
  return `desde ${fmt(desde as string)}`;
}

export function PromoTable({
  rows,
  basePath,
}: {
  rows: PromoAdminRow[];
  basePath: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl">Todavía no hay promos.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Creá una promo sobre uno de tus comercios publicados.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Promo</th>
            <th className="px-4 py-3 font-medium">Comercio</th>
            <th className="px-4 py-3 font-medium">Beneficio</th>
            <th className="px-4 py-3 font-medium">Vigencia</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.id} className="transition hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link
                  href={`${basePath}/${p.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {p.titulo}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {p.comercioNombre}
                <span className="ml-1 text-xs text-muted-foreground/70">
                  · {TIPO_LABEL[p.comercio_tipo]}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {p.pct ? (
                  <span className="font-medium text-foreground">-{p.pct}%</span>
                ) : null}{" "}
                {p.beneficio}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {vigenciaLabel(p.vigencia_desde, p.vigencia_hasta)}
              </td>
              <td className="px-4 py-3">
                <Badge
                  className={
                    p.activo
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }
                >
                  {p.activo ? "Activa" : "Inactiva"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
