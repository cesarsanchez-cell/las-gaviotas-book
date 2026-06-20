import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { AtraccionForm } from "@/features/admin/components/AtraccionForm";
import {
  createAtraccionAction,
  listZonasParaAtraccion,
} from "@/features/admin/lib/atraccion-management";

export default async function NuevaAtraccionPage() {
  await requireAdmin();
  const zonas = await listZonasParaAtraccion();

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
          Nueva atracción
        </h1>
      </div>

      <AtraccionForm
        action={createAtraccionAction}
        zonas={zonas}
        submitLabel="Crear atracción"
      />
    </div>
  );
}
