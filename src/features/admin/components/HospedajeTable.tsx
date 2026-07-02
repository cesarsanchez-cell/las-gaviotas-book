import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TIPO_HOSPEDAJE_LABEL } from "@/features/hospedajes/types";
import type { AdminHospedajeRow } from "@/features/admin/lib/queries";
import type { EstadoHospedaje } from "@/types/database";

const ESTADO_LABEL: Record<EstadoHospedaje, string> = {
  borrador: "Borrador",
  pendiente_validacion: "Pendiente",
  publicado: "Publicado",
  pausado: "Pausado",
  rechazado: "Rechazado",
};

const ESTADO_CLASS: Record<EstadoHospedaje, string> = {
  borrador: "bg-slate-100 text-slate-700",
  pendiente_validacion: "bg-amber-100 text-amber-800",
  publicado: "bg-emerald-100 text-emerald-800",
  pausado: "bg-blue-100 text-blue-800",
  rechazado: "bg-rose-100 text-rose-800",
};

interface HospedajeTableProps {
  rows: AdminHospedajeRow[];
}

export function HospedajeTable({ rows }: HospedajeTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl">No hay hospedajes para mostrar.</p>
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
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Tipo</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Destino</th>
            <th className="px-2 py-3 font-medium text-center sm:px-4">Estado</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Responsable</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell text-right">Actualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((h) => (
            <tr key={h.id} className="transition hover:bg-muted/40">
              <td className="px-2 py-3 sm:px-4">
                <Link
                  href={`/admin/hospedajes/${h.id}`}
                  className="font-medium text-foreground hover:text-primary text-xs sm:text-sm"
                >
                  {h.nombre}
                </Link>
                {h.destacado && (
                  <Badge variant="featured" className="ml-2 text-[10px]">
                    Destacado
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">{h.slug}</p>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                {TIPO_HOSPEDAJE_LABEL[h.tipo]}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{h.destino_nombre}</td>
              <td className="px-2 py-3 text-center sm:px-4">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_CLASS[h.estado]}`}
                >
                  {ESTADO_LABEL[h.estado]}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {h.responsable_nombre}
              </td>
              <td className="hidden px-4 py-3 text-xs text-muted-foreground tabular-nums text-right sm:table-cell">
                {new Date(h.updated_at).toLocaleDateString("es-AR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
