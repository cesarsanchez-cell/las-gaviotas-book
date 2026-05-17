import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { DestinoForm } from "@/features/admin/components/DestinoForm";
import { createDestinoAction } from "@/features/admin/lib/destino-management";

export default async function NuevoDestinoPage() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <Link
          href="/admin/destinos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a destinos
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">Nuevo destino</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos básicos. Después agregás localidades y hospedajes desde sus
          propias secciones.
        </p>
      </header>

      <DestinoForm submitLabel="Crear destino" action={createDestinoAction} />
    </div>
  );
}
