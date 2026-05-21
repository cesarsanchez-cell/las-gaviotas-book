import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listRegionesAdmin } from "@/features/admin/lib/region-management";
import { RegionesList } from "@/features/admin/components/RegionesList";

export default async function AdminRegionesPage() {
  const me = await requireAdmin();
  const regiones = await listRegionesAdmin();

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Regiones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agrupamientos geográfico-culturales que muestran al viajero
            cuando la red tiene muchos destinos. Cada destino pertenece a
            una región.
            {!me.isSuperAdmin && (
              <> Como admin local, podés ver el listado pero no crear ni editar regiones.</>
            )}
          </p>
        </div>
        {me.isSuperAdmin && (
          <Link
            href="/admin/regiones/nueva"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva región
          </Link>
        )}
      </header>

      <RegionesList regiones={regiones} canEdit={me.isSuperAdmin} />
    </div>
  );
}
