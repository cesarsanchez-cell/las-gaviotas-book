import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listResponsablesAction,
  listEntidadesAsignables,
} from "@/features/admin/lib/responsable-management";
import { ResponsablesList } from "@/features/admin/components/ResponsablesList";
import { NewResponsableForm } from "@/features/admin/components/NewResponsableForm";
import { ResponsablesSearch } from "@/features/admin/components/ResponsablesSearch";

export default async function ResponsablesPage() {
  const me = await requireAdmin();
  const [responsables, entidadesDisponibles] = await Promise.all([
    listResponsablesAction(),
    listEntidadesAsignables(),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Responsables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuarios que gestionan uno o más hospedajes o gastronómicos desde su
          panel. Reciben las consultas de los huéspedes por mail.
          {!me.isSuperAdmin && (
            <>
              {" "}
              Como admin local solo ves responsables con al menos una entidad
              en tu destino.
            </>
          )}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">
          Contactar responsable
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Genera un link de registro que podés enviar por WhatsApp. El responsable se registra,
          confirma su email, y luego crea su hospedaje, gastronómico o atracción desde su panel.
        </p>
        <div className="mt-5">
          <NewResponsableForm />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl tracking-tight">
          Responsables existentes
        </h2>
        <div className="mb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Busca por nombre del responsable o por nombre de su comercio.
          </p>
          <ResponsablesSearch />
        </div>
        <ResponsablesList
          responsables={responsables}
          entidadesDisponibles={entidadesDisponibles}
        />
      </section>
    </div>
  );
}
