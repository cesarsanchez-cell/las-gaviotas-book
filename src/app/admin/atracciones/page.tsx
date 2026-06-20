import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listAtraccionesAdmin } from "@/features/admin/lib/atraccion-management";
import { AtraccionesList } from "@/features/admin/components/AtraccionesList";

export default async function AdminAtraccionesPage() {
  await requireAdmin();
  const atracciones = await listAtraccionesAdmin();

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Atracciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contenido curado de cada zona (playas, bosques, eventos). No comercial:
            sin precio ni consulta. Componen el hero del destino.
          </p>
        </div>
        <Link
          href="/admin/atracciones/nueva"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva atracción
        </Link>
      </header>

      <AtraccionesList atracciones={atracciones} />
    </div>
  );
}
