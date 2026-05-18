import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="flex items-start gap-3">
          <Construction className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Calendario en migración</p>
            <p>
              La disponibilidad está siendo refactorizada para soportar
              múltiples unidades por hospedaje, cada una con su propio
              calendario. Como admin la seguís viendo en modo lectura cuando el
              refactor termine.
            </p>
            <p>
              Las consultas siguen llegando con normalidad a la bandeja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
