import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bed } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { listDiasBloqueados } from "@/features/disponibilidad/lib/queries";
import { listUnidadesPorHospedaje } from "@/features/unidades/lib/queries";
import { DisponibilidadCalendar } from "@/features/disponibilidad/components/DisponibilidadCalendar";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MESES_VISIBLES = 6;

export default async function AdminDisponibilidadPage({ params }: PageProps) {
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

  const unidades = await listUnidadesPorHospedaje(id, { incluirInactivas: true });

  if (unidades.length === 0) {
    return (
      <div className="max-w-3xl space-y-6">
        <header>
          <Link
            href={`/admin/hospedajes/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al hospedaje
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            Disponibilidad · {hospedaje.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vista de solo lectura.
          </p>
        </header>

        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Bed className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg tracking-tight">
            Este hospedaje no tiene unidades cargadas
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            El responsable todavía no cargó ninguna unidad. Hasta entonces no
            hay disponibilidad que mostrar.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setMonth(end.getMonth() + MESES_VISIBLES + 2);
  const desde = today.toISOString().slice(0, 10);
  const hasta = end.toISOString().slice(0, 10);
  const diasBloqueados = await listDiasBloqueados(id, desde, hasta);

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
          Disponibilidad · {hospedaje.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vista de solo lectura. La disponibilidad la gestiona únicamente el
          responsable del hospedaje — quien sabe qué puede ofrecer.
        </p>
      </header>

      <DisponibilidadCalendar
        hospedajeNombre={hospedaje.nombre}
        unidades={unidades}
        diasBloqueados={diasBloqueados}
        mesesVisibles={MESES_VISIBLES}
        readOnly
      />
    </div>
  );
}
