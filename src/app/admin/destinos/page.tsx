import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listDestinosAdmin } from "@/features/admin/lib/destino-management";
import { DestinosList } from "@/features/admin/components/DestinosList";

export default async function AdminDestinosPage() {
  const me = await requireAdmin();
  const destinos = await listDestinosAdmin();

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Destinos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comunidades turísticas que forman la red Mis Escapadas. Cada destino
            tiene su propio portal en <code>/{`{slug}`}</code>.
            {!me.isSuperAdmin && (
              <> Como admin local, podés ver el listado pero no crear ni editar destinos.</>
            )}
          </p>
        </div>
        {me.isSuperAdmin && (
          <Link
            href="/admin/destinos/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo destino
          </Link>
        )}
      </header>

      <DestinosList destinos={destinos} canEdit={me.isSuperAdmin} />
    </div>
  );
}
