import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";
import { listDiasBloqueados } from "@/features/disponibilidad/lib/queries";
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
          Como admin podés editar la disponibilidad de cualquier hospedaje de
          tu scope. Cambios afectan al calendario público y al estado en consultas.
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
