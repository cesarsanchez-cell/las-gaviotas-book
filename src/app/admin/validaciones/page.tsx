import { requireAdmin } from "@/features/admin/lib/auth";
import { listPendientesValidacion } from "@/features/admin/lib/queries";
import { ValidacionCard } from "@/features/admin/components/ValidacionCard";

export default async function ValidacionesPage() {
  await requireAdmin();
  const pendientes = await listPendientesValidacion();

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Cola de validación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hospedajes en estado{" "}
          <span className="font-medium">pendiente de validación</span> esperando
          aprobación.
        </p>
      </header>

      {pendientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-display text-xl">No hay nada pendiente</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando un responsable envíe un hospedaje a revisión, va a aparecer
            acá.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {pendientes.length}{" "}
          {pendientes.length === 1 ? "hospedaje" : "hospedajes"} esperando
          aprobación
        </p>
      )}

      <div className="space-y-6">
        {pendientes.map((h) => (
          <ValidacionCard key={h.id} hospedaje={h} />
        ))}
      </div>
    </div>
  );
}
