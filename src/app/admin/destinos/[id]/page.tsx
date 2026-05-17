import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { DestinoForm } from "@/features/admin/components/DestinoForm";
import {
  getDestino,
  updateDestinoAction,
} from "@/features/admin/lib/destino-management";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDestinoPage({ params }: PageProps) {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) notFound();
  const { id } = await params;

  const destino = await getDestino(id);
  if (!destino) notFound();

  const updateWithId = updateDestinoAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/destinos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a destinos
          </Link>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            {destino.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Editar destino · <code>/{destino.slug}</code>
            {!destino.activo && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                Inactivo
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/${destino.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Ver público
          <ExternalLink className="h-4 w-4" />
        </Link>
      </header>

      <DestinoForm
        initial={destino}
        submitLabel="Guardar cambios"
        action={updateWithId}
      />
    </div>
  );
}
