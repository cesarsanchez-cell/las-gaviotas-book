import { requireAdmin } from "@/features/admin/lib/auth";
import { listPendientesValidacion } from "@/features/admin/lib/queries";
import { listLugaresPendientesValidacion } from "@/features/admin/lib/lugar-queries";
import { listCombosPendientesValidacion } from "@/features/combos/lib/queries";
import { ValidacionCard } from "@/features/admin/components/ValidacionCard";
import { LugarValidacionCard } from "@/features/admin/components/LugarValidacionCard";
import { ComboTable } from "@/features/combos/components/ComboTable";

export default async function ValidacionesPage() {
  const admin = await requireAdmin();
  const [pendientesHospedajes, pendientesLugares, pendientesCombos] =
    await Promise.all([
      listPendientesValidacion(admin.destinoId),
      listLugaresPendientesValidacion(admin.destinoId),
      listCombosPendientesValidacion(admin.destinoId),
    ]);

  const pendientesGastro = pendientesLugares.filter(
    (l) => l.tipo === "gastronomico"
  );
  const pendientesQueHacer = pendientesLugares.filter(
    (l) => l.tipo === "atractivo"
  );

  const total =
    pendientesHospedajes.length +
    pendientesLugares.length +
    pendientesCombos.length;

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Cola de validación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hospedajes, gastronómicos y actividades (qué hacer) en estado{" "}
          <span className="font-medium">pendiente de validación</span>{" "}
          esperando tu OK.
        </p>
      </header>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-display text-xl">No hay nada pendiente</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cuando un responsable envíe algo a revisión, va a aparecer acá.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "ítem" : "ítems"} esperando aprobación
        </p>
      )}

      {pendientesHospedajes.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl tracking-tight">
            Hospedajes ({pendientesHospedajes.length})
          </h2>
          <div className="space-y-6">
            {pendientesHospedajes.map((h) => (
              <ValidacionCard key={h.id} hospedaje={h} />
            ))}
          </div>
        </section>
      )}

      {pendientesGastro.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl tracking-tight">
            Gastronomía ({pendientesGastro.length})
          </h2>
          <div className="space-y-6">
            {pendientesGastro.map((l) => (
              <LugarValidacionCard key={l.id} lugar={l} />
            ))}
          </div>
        </section>
      )}

      {pendientesQueHacer.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl tracking-tight">
            Qué hacer ({pendientesQueHacer.length})
          </h2>
          <div className="space-y-6">
            {pendientesQueHacer.map((l) => (
              <LugarValidacionCard key={l.id} lugar={l} />
            ))}
          </div>
        </section>
      )}

      {pendientesCombos.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl tracking-tight">
            Combos ({pendientesCombos.length})
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Abrí cada combo para revisarlo y publicarlo o rechazarlo.
          </p>
          <ComboTable rows={pendientesCombos} basePath="/admin/combos" />
        </section>
      )}
    </div>
  );
}
