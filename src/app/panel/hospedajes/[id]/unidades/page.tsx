import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUnidadTypesPorHospedaje } from "@/features/unidades/lib/queries";
import { UnidadTypesList } from "@/features/unidades/components/UnidadTypesList";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PanelUnidadesPage({ params }: PageProps) {
  const user = await requireResponsable();
  const { id } = await params;

  if (!user.hospedajeIds.includes(id)) notFound();

  const sb = createAdminClient();
  const { data: hospedaje } = await sb
    .from("hospedajes")
    .select("id, nombre")
    .eq("id", id)
    .maybeSingle<{ id: string; nombre: string }>();
  if (!hospedaje) notFound();

  const unidadTypes = await listUnidadTypesPorHospedaje(id);

  return (
    <div className="max-w-6xl space-y-6">
      <header>
        <Link
          href={`/panel/hospedajes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al hospedaje
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Unidades · {hospedaje.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Definí los tipos de unidad que ofrecés (cabaña, dúplex, apart, casa,
          etc.) y cuántas unidades físicas tenés de cada tipo. La disponibilidad,
          tarifas y restricciones se gestionan por tipo.
        </p>
      </header>

      <UnidadTypesList
        unidadTypes={unidadTypes}
        baseHref={`/panel/hospedajes/${id}/unidades`}
      />
    </div>
  );
}
