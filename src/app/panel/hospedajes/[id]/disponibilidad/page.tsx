import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDiasBloqueados } from "@/features/disponibilidad/lib/queries";
import { DisponibilidadCalendar } from "@/features/disponibilidad/components/DisponibilidadCalendar";

interface PageProps {
  params: Promise<{ id: string }>;
}

const MESES_VISIBLES = 6;

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

  // Cargar bloqueados desde hoy hasta MESES_VISIBLES + 2 meses adelante (buffer
  // por si el usuario navega hacia adelante).
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
          href={`/panel/hospedajes/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al hospedaje
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Disponibilidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marcá los días en que el hospedaje no está disponible (cierre, refacción,
          temporada baja). Los días sin marcar se muestran como disponibles al público.
        </p>
      </header>

      <DisponibilidadCalendar
        hospedajeId={hospedaje.id}
        hospedajeNombre={hospedaje.nombre}
        diasBloqueados={diasBloqueados}
        mesesVisibles={MESES_VISIBLES}
      />
    </div>
  );
}
