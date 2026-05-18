import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { listUnidadTypesPorHospedaje } from "@/features/unidades/lib/queries";
import { UnidadTypesList } from "@/features/unidades/components/UnidadTypesList";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUnidadesPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  try {
    await assertAdminCanAccessHospedaje(admin, id);
  } catch {
    notFound();
  }

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
          href={`/admin/hospedajes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al hospedaje
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Unidades · {hospedaje.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista de solo lectura. Las unidades, tarifas y disponibilidad las
          gestiona únicamente el responsable del hospedaje.
        </p>
      </header>

      <UnidadTypesList
        unidadTypes={unidadTypes}
        baseHref={`/admin/hospedajes/${id}/unidades`}
        readOnly
      />
    </div>
  );
}
