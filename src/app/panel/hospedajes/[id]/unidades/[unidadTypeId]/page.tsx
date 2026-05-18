import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnidadType } from "@/features/unidades/lib/queries";
import { UnidadTypeForm } from "@/features/unidades/components/UnidadTypeForm";
import { UnidadTypeFotosManager } from "@/features/unidades/components/UnidadTypeFotosManager";
import { UnidadInstancesManager } from "@/features/unidades/components/UnidadInstancesManager";
import { updateUnidadTypeAction } from "@/features/unidades/lib/actions";

interface PageProps {
  params: Promise<{ id: string; unidadTypeId: string }>;
}

export default async function EditUnidadTypePage({ params }: PageProps) {
  const user = await requireResponsable();
  const { id, unidadTypeId } = await params;

  if (!(user.perfil.hospedajes_ids ?? []).includes(id)) notFound();

  const sb = createAdminClient();
  const { data: hospedaje } = await sb
    .from("hospedajes")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle<{ id: string; nombre: string }>();
  if (!hospedaje) notFound();

  const unidadType = await getUnidadType(unidadTypeId);
  if (!unidadType || unidadType.hospedaje_id !== id) notFound();

  const updateAction = updateUnidadTypeAction.bind(null, unidadTypeId);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <Link
          href={`/panel/hospedajes/${id}/unidades`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al listado
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          {unidadType.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hospedaje.nombre}
        </p>
      </header>

      <UnidadTypeForm
        initial={unidadType}
        hospedajeId={id}
        submitLabel="Guardar cambios"
        action={updateAction}
      />

      <UnidadTypeFotosManager
        unidadTypeId={unidadType.id}
        fotos={unidadType.fotos}
      />

      <UnidadInstancesManager
        unidadTypeId={unidadType.id}
        unidadTypeNombre={unidadType.nombre}
        unidades={unidadType.unidades}
      />
    </div>
  );
}
