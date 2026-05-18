import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PanelDisponibilidadPage({ params }: PageProps) {
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
    <div className="max-w-3xl space-y-6">
      <header>
        <Link
          href={`/panel/hospedajes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al hospedaje
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Disponibilidad · {hospedaje.nombre}
        </h1>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <Construction className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Calendario en migración</p>
            <p>
              Estamos rediseñando la disponibilidad para que cada{" "}
              <strong>unidad</strong> (cabaña, dúplex, apart, casa) tenga su
              propio calendario. Hoy un hospedaje puede tener varias unidades de
              distintos tamaños y no es lo mismo tener libre una unidad para 2
              pax que recibir una consulta de familia de 6.
            </p>
            <p>
              <strong>Mientras tanto:</strong> las consultas siguen llegando con
              normalidad al panel y por mail. Cuando esté lista la nueva versión
              vas a poder cargar tus unidades, sus tarifas, restricciones y
              calendario individual.
            </p>
            <p className="text-xs">
              Pronto vas a ver acá el alta de unidades del hospedaje.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
