import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ComboAdminRow } from "@/features/combos/lib/queries";
import type { EstadoCombo } from "@/types/database";

export const ESTADO_COMBO_LABEL: Record<EstadoCombo, string> = {
  borrador: "Borrador",
  pendiente_validacion: "Pendiente",
  publicado: "Publicado",
  pausado: "Pausado",
  rechazado: "Rechazado",
};

export const ESTADO_COMBO_CLASS: Record<EstadoCombo, string> = {
  borrador: "bg-slate-100 text-slate-700",
  pendiente_validacion: "bg-amber-100 text-amber-800",
  publicado: "bg-emerald-100 text-emerald-800",
  pausado: "bg-blue-100 text-blue-800",
  rechazado: "bg-rose-100 text-rose-800",
};

export function ComboTable({
  rows,
  basePath,
  showDestino = true,
}: {
  rows: ComboAdminRow[];
  basePath: string;
  showDestino?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl">Todavía no hay combos.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Armá una escapada cruzando 2-3 comercios.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left">
          <tr>
            <th className="px-2 py-2 font-medium sm:px-4">Combo</th>
            <th className="hidden px-4 py-2 font-medium sm:table-cell">Incluye</th>
            {showDestino && <th className="hidden px-4 py-2 font-medium md:table-cell">Destino</th>}
            <th className="px-2 py-2 font-medium sm:px-4">Precio</th>
            <th className="px-2 py-2 font-medium sm:px-4">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((c) => (
            <tr key={c.id} className="transition hover:bg-muted/40">
              <td className="px-2 py-3 sm:px-4">
                <Link
                  href={`${basePath}/${c.id}`}
                  className="font-medium text-xs text-foreground hover:text-primary sm:text-sm"
                >
                  {c.titulo}
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {c.itemsResumen}
              </td>
              {showDestino && (
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {c.destinoNombre}
                </td>
              )}
              <td className="px-2 py-3 text-xs text-muted-foreground sm:px-4 sm:text-sm">
                {c.precio_desde
                  ? `$${c.precio_desde.toLocaleString("es-AR")}`
                  : "—"}
                {c.ahorro_pct ? (
                  <span className="ml-1 text-xs text-emerald-700">-{c.ahorro_pct}%</span>
                ) : null}
              </td>
              <td className="px-2 py-3 sm:px-4">
                <Badge className={ESTADO_COMBO_CLASS[c.estado]}>
                  {ESTADO_COMBO_LABEL[c.estado]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
