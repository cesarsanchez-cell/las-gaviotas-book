import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCategoriaLabel } from "@/config/categorias-lugar";
import type { AdminLugarRow } from "@/features/admin/lib/lugar-queries";
import type { EstadoLugar, TipoLugar } from "@/types/database";

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

interface LugarTableProps {
  rows: AdminLugarRow[];
  /** Tipo es el contexto: gastro tiene columna Responsable, atractivo no. */
  tipo: TipoLugar;
  basePath: string;
}

export function LugarTable({ rows, tipo, basePath }: LugarTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl">
          {tipo === "gastronomico"
            ? "No hay gastronómicos para mostrar."
            : "No hay atractivos para mostrar."}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Creá uno nuevo o cambiá el filtro de estado.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left">
          <tr>
            <th className="px-2 py-3 font-medium sm:px-4">Nombre</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Categoría</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Destino</th>
            <th className="px-2 py-3 font-medium text-center sm:px-4">Estado</th>
            {tipo === "gastronomico" && (
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Responsable</th>
            )}
            <th className="hidden px-4 py-3 font-medium text-right sm:table-cell">Actualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((l) => (
            <tr key={l.id} className="transition hover:bg-muted/40">
              <td className="px-2 py-3 sm:px-4">
                <Link
                  href={`${basePath}/${l.id}`}
                  className="font-medium text-foreground hover:text-primary text-xs sm:text-sm"
                >
                  {l.nombre}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {l.imperdible && (
                    <Badge variant="featured" className="text-[10px]">
                      Imperdible
                    </Badge>
                  )}
                  {l.destacado && (
                    <Badge variant="secondary" className="text-[10px]">
                      Destacado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{l.slug}</p>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {getCategoriaLabel(l.tipo, l.categoria) ?? l.categoria}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {l.destino_nombre}
              </td>
              <td className="px-2 py-3 text-center sm:px-4">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[l.estado]}`}
                >
                  {ESTADO_LABEL[l.estado]}
                </span>
              </td>
              {tipo === "gastronomico" && (
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  {l.responsable_nombre ?? (
                    <span className="text-amber-700 italic">
                      Sin responsable
                    </span>
                  )}
                </td>
              )}
              <td className="hidden px-4 py-3 text-xs text-muted-foreground tabular-nums text-right sm:table-cell">
                {new Date(l.updated_at).toLocaleDateString("es-AR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
