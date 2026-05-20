import Link from "next/link";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listResponsablesAction,
  listHospedajesForAsignacion,
} from "@/features/admin/lib/responsable-management";
import { ResponsablesList } from "@/features/admin/components/ResponsablesList";
import { NewResponsableForm } from "@/features/admin/components/NewResponsableForm";

export default async function ResponsablesPage() {
  const me = await requireAdmin();
  const [responsables, hospedajesDisponibles] = await Promise.all([
    listResponsablesAction(),
    listHospedajesForAsignacion(),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Responsables</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuarios que gestionan uno o más hospedajes desde su panel. Reciben
          las consultas de los huéspedes por mail.
          {!me.isSuperAdmin && (
            <>
              {" "}
              Como admin local solo ves responsables con al menos un hospedaje
              en tu destino.
            </>
          )}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">
          Invitar responsable
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le da acceso al panel de los hospedajes que le asignes. Recibe un mail
          con un link para activar su cuenta y definir su propia contraseña.
        </p>
        <div className="mt-5">
          {hospedajesDisponibles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay hospedajes disponibles para asignar. Creá uno primero desde{" "}
              <Link href="/admin/hospedajes/nuevo" className="underline">
                /admin/hospedajes/nuevo
              </Link>
              .
            </p>
          ) : (
            <NewResponsableForm
              hospedajes={hospedajesDisponibles}
              showDestino={me.isSuperAdmin}
            />
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl tracking-tight">
          Responsables existentes
        </h2>
        <ResponsablesList
          responsables={responsables}
          hospedajesDisponibles={hospedajesDisponibles}
        />
      </section>
    </div>
  );
}
