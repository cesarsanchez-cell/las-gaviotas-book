import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { AtraccionForm } from "@/features/admin/components/AtraccionForm";
import {
  getAtraccion,
  updateAtraccionAction,
  listZonasParaAtraccion,
} from "@/features/admin/lib/atraccion-management";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAtraccionPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const [atraccion, zonas] = await Promise.all([
    getAtraccion(id),
    listZonasParaAtraccion(),
  ]);
  if (!atraccion) notFound();

  const action = updateAtraccionAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/atracciones"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a atracciones
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {atraccion.nombre}
        </h1>
      </div>

      <AtraccionForm
        atraccion={atraccion}
        zonas={zonas}
        action={action}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
