import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { getMyHospedaje } from "@/features/panel/lib/queries";
import {
  listDestinosForSelect,
  listLocalidadesForSelect,
  getLatestEventNote,
} from "@/features/admin/lib/queries";
import { HospedajeForm } from "@/features/admin/components/HospedajeForm";
import { FotosManager } from "@/features/admin/components/FotosManager";
import { updateHospedajeAsResponsableAction } from "@/features/panel/lib/hospedaje-actions";
import { Checklist } from "@/features/panel/components/Checklist";
import { EstadoControls } from "@/features/panel/components/EstadoControls";
import {
  evaluateChecklist,
  checklistPasses,
  checklistSummary,
} from "@/features/panel/lib/checklist";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  pendiente_validacion: "Pendiente de revisión",
  publicado: "Publicado",
  pausado: "Pausado",
  rechazado: "Rechazado — corregí y volvé a enviar",
};

export default async function EditMyHospedajePage({ params }: PageProps) {
  const user = await requireResponsable();
  const { id } = await params;

  const hospedaje = await getMyHospedaje(id, user.hospedajeIds);
  if (!hospedaje) notFound();

  const destinos = await listDestinosForSelect();
  const localidadesPorDestino: Record<
    string,
    Awaited<ReturnType<typeof listLocalidadesForSelect>>
  > = {};
  for (const d of destinos) {
    localidadesPorDestino[d.id] = await listLocalidadesForSelect(d.id);
  }

  const destinoSlug =
    destinos.find((d) => d.id === hospedaje.destino_id)?.slug ?? "";

  const updateWithId = updateHospedajeAsResponsableAction.bind(null, id);

  const checklistItems = evaluateChecklist(hospedaje, hospedaje.hospedaje_fotos);
  const canSubmit = checklistPasses(checklistItems);
  const { total } = checklistSummary(checklistItems);
  const missingCount = total - checklistItems.filter((i) => i.ok).length;

  const publicHref =
    destinoSlug && hospedaje.estado === "publicado"
      ? `/${destinoSlug}/hospedajes/${hospedaje.slug}`
      : undefined;

  const rejectionNote =
    hospedaje.estado === "rechazado"
      ? (await getLatestEventNote(hospedaje.id))?.notas ?? null
      : null;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al panel
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            {hospedaje.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado: {ESTADO_LABEL[hospedaje.estado] ?? hospedaje.estado}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/panel/hospedajes/${hospedaje.id}/unidades`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-secondary"
          >
            Unidades
          </Link>
          <Link
            href={`/panel/hospedajes/${hospedaje.id}/disponibilidad`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-secondary"
          >
            Disponibilidad
          </Link>
          {publicHref && (
            <Link
              href={publicHref}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver publicado
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </header>

      <EstadoControls
        hospedajeId={hospedaje.id}
        estado={hospedaje.estado}
        canSubmit={canSubmit}
        missingCount={missingCount}
        publicHref={publicHref}
        rejectionNote={rejectionNote}
      />

      <Checklist items={checklistItems} />

      <FotosManager
        hospedajeId={hospedaje.id}
        fotos={hospedaje.hospedaje_fotos}
      />

      {(hospedaje.estado === "publicado" || hospedaje.estado === "pausado") && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Cambios que requieren nueva revisión</p>
            <p className="mt-0.5">
              Modificar nombre, tipo, slug, destino, dirección, capacidad,
              WhatsApp o datos del responsable hace que el hospedaje vuelva a{" "}
              <strong>pendiente de revisión</strong> y salga del listado público
              hasta que el equipo lo re-apruebe. Cambios de descripción, fotos,
              amenities o redes sociales se aplican sin revisión.
            </p>
          </div>
        </div>
      )}

      <HospedajeForm
        destinos={destinos}
        localidadesPorDestino={localidadesPorDestino}
        initial={hospedaje}
        submitLabel="Guardar cambios"
        action={updateWithId}
        mode="responsable"
      />
    </div>
  );
}
