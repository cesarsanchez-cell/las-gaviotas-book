import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import {
  listDestinosForSelect,
  listLocalidadesForSelect,
} from "@/features/admin/lib/queries";
import { HospedajeForm } from "@/features/admin/components/HospedajeForm";
import { createHospedajeAsResponsableAction } from "@/features/panel/lib/hospedaje-actions";

export default async function NuevoHospedajePanelPage() {
  const user = await requireResponsable();

  const destinos = await listDestinosForSelect();
  const localidadesPorDestino: Record<
    string,
    Awaited<ReturnType<typeof listLocalidadesForSelect>>
  > = {};
  for (const d of destinos) {
    localidadesPorDestino[d.id] = await listLocalidadesForSelect(d.id);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <Link
          href="/panel"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al panel
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Cargar nuevo hospedaje
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completá los datos. Las fotos se cargan después de guardar. Cuando
          esté listo, lo enviás a revisión.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Responsable: {user.perfil.nombre ?? user.email}
        </p>
      </header>

      <HospedajeForm
        destinos={destinos}
        localidadesPorDestino={localidadesPorDestino}
        submitLabel="Crear hospedaje"
        action={createHospedajeAsResponsableAction}
        mode="responsable"
        initial={{ responsable_nombre: user.perfil.nombre ?? "" }}
      />
    </div>
  );
}
