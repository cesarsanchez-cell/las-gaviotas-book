import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UnidadTypeForm } from "@/features/unidades/components/UnidadTypeForm";
import { createUnidadTypeAction } from "@/features/unidades/lib/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function actionWithRedirect(formData: FormData) {
  "use server";
  const res = await createUnidadTypeAction(formData);
  if (res.ok && res.redirectTo) redirect(res.redirectTo);
  return res;
}

export default async function NuevoUnidadTypePage({ params }: PageProps) {
  const user = await requireResponsable();
  const { id } = await params;

  if (!(user.perfil.hospedajes_ids ?? []).includes(id)) notFound();

  const sb = createAdminClient();
  const { data: hospedaje } = await sb
    .from("hospedajes")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle<{ id: string; nombre: string }>();
  if (!hospedaje) notFound();

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
          Nuevo tipo de unidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hospedaje.nombre}. Después de crear el tipo vas a poder agregar las
          unidades físicas (Dúplex 1, Dúplex 2, etc.) y subir fotos.
        </p>
      </header>

      <UnidadTypeForm
        hospedajeId={id}
        submitLabel="Crear tipo de unidad"
        action={actionWithRedirect}
      />
    </div>
  );
}
