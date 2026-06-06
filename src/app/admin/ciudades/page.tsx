import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listCiudadesAdmin } from "@/features/admin/lib/ciudad-management";
import { CiudadesList } from "@/features/admin/components/CiudadesList";

export default async function AdminCiudadesPage() {
  const me = await requireAdmin();
  const ciudades = await listCiudadesAdmin();

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Ciudades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nivel intermedio opcional entre región y destino. Agrupa destinos
            cercanos (ej. Villa Gesell → Las Gaviotas, Mar Azul, Mar de las
            Pampas).
            {!me.isSuperAdmin && (
              <> Como admin local, podés ver el listado pero no editar.</>
            )}
          </p>
        </div>
        {me.isSuperAdmin && (
          <Link
            href="/admin/ciudades/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva ciudad
          </Link>
        )}
      </header>

      <CiudadesList ciudades={ciudades} canEdit={me.isSuperAdmin} />
    </div>
  );
}
