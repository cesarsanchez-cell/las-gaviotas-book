import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bed } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDiasBloqueados } from "@/features/disponibilidad/lib/queries";
import { listUnidadesPorHospedaje } from "@/features/unidades/lib/queries";
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

  // Traemos todas las unidades (activas e inactivas) — el componente filtra.
  // Si no hay ninguna cargada, mostramos un CTA hacia /unidades.
  const unidades = await listUnidadesPorHospedaje(id, { incluirInactivas: true });

  if (unidades.length === 0) {
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

        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Bed className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-lg tracking-tight">
            Primero cargá tus unidades
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            La disponibilidad se gestiona por <strong>unidad física</strong>.
            Cargá al menos una unidad y volvé acá para definir su calendario.
          </p>
          <Link
            href={`/panel/hospedajes/${id}/unidades`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Ir a Unidades
          </Link>
        </div>
      </div>
    );
  }

  // Cargar bloqueados desde hoy hasta MESES_VISIBLES + 2 meses (buffer si el
  // user navega hacia adelante).
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
          Disponibilidad · {hospedaje.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada unidad tiene su calendario propio. Cambiá de tab para gestionar
          la unidad correspondiente. Los días sin marcar se muestran como
          disponibles al público.
        </p>
      </header>

      <DisponibilidadCalendar
        hospedajeNombre={hospedaje.nombre}
        unidades={unidades}
        diasBloqueados={diasBloqueados}
        mesesVisibles={MESES_VISIBLES}
      />
    </div>
  );
}
