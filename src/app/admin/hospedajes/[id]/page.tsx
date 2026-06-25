import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  getHospedajeForEdit,
  listDestinosForSelect,
  listLocalidadesForSelect,
} from "@/features/admin/lib/queries";
import { HospedajeForm } from "@/features/admin/components/HospedajeForm";
import { updateHospedajeAction } from "@/features/admin/lib/hospedaje-actions";
import { FotosManager } from "@/features/admin/components/FotosManager";
import type { HospedajeFotoRow, HospedajeRow } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHospedajePage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const hospedaje = (await getHospedajeForEdit(id)) as
    | (HospedajeRow & { hospedaje_fotos: HospedajeFotoRow[] })
    | null;
  if (!hospedaje) notFound();

  const destinos = await listDestinosForSelect(admin.destinoId);
  const localidadesPorDestino: Record<
    string,
    Awaited<ReturnType<typeof listLocalidadesForSelect>>
  > = {};
  for (const d of destinos) {
    localidadesPorDestino[d.id] = await listLocalidadesForSelect(d.id);
  }

  const destinoSlug =
    destinos.find((d) => d.id === hospedaje.destino_id)?.slug ?? "";

  const updateWithId = updateHospedajeAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/hospedajes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a hospedajes
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            {hospedaje.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Editor — {hospedaje.estado}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/hospedajes/${id}/unidades`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-secondary"
          >
            Unidades
          </Link>
          <Link
            href={`/admin/hospedajes/${id}/disponibilidad`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-secondary"
          >
            Disponibilidad
          </Link>
          {destinoSlug && hospedaje.estado === "publicado" && (
            <Link
              href={`/${destinoSlug}/hospedajes/${hospedaje.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver publicado
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <FotosManager
        hospedajeId={hospedaje.id}
        fotos={hospedaje.hospedaje_fotos}
      />

      <HospedajeForm
        destinos={destinos}
        localidadesPorDestino={localidadesPorDestino}
        initial={hospedaje}
        submitLabel="Guardar cambios"
        action={updateWithId}
        isSuperAdmin={admin.isSuperAdmin}
      />
    </div>
  );
}
