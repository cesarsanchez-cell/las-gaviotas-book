import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listZonasAdmin } from "@/features/admin/lib/zona-management";
import { ZonasList } from "@/features/admin/components/ZonasList";

export default async function AdminZonasPage() {
  const me = await requireAdmin();
  const zonas = await listZonasAdmin();

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Zonas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conglomerados de destinos dentro de una ciudad (ej. Pueblos del bosque
            → Las Gaviotas, Mar Azul, Mar de las Pampas). Las atracciones cuelgan
            de una zona.
            {!me.isSuperAdmin && (
              <> Como admin local, podés ver el listado pero no editar.</>
            )}
          </p>
        </div>
        {me.isSuperAdmin && (
          <Link
            href="/admin/zonas/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva zona
          </Link>
        )}
      </header>

      <ZonasList zonas={zonas} canEdit={me.isSuperAdmin} />
    </div>
  );
}
