import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listDestinosForSelect,
  listLocalidadesForSelect,
} from "@/features/admin/lib/queries";
import { HospedajeForm } from "@/features/admin/components/HospedajeForm";
import { createHospedajeAction } from "@/features/admin/lib/hospedaje-actions";

export default async function NuevoHospedajePage() {
  await requireAdmin();

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
          href="/admin/hospedajes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a hospedajes
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Nuevo hospedaje
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Llená los datos. Las fotos se cargan después de guardar.
        </p>
      </header>

      <HospedajeForm
        destinos={destinos}
        localidadesPorDestino={localidadesPorDestino}
        submitLabel="Crear hospedaje"
        action={createHospedajeAction}
      />
    </div>
  );
}
