import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listRubros,
  listDatosUtilesByDestino,
  countItemsByRubro,
} from "@/features/datos-utiles/lib/queries";
import { DatosUtilesPanel } from "@/features/datos-utiles/components/DatosUtilesPanel";
import { DatosUtilesSuperAdminView } from "@/features/datos-utiles/components/DatosUtilesSuperAdminView";
import { listDestinosAdmin } from "@/features/admin/lib/destino-management";

interface PageProps {
  searchParams: Promise<{ destino_id?: string }>;
}

export default async function DatosUtilesPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const params = await searchParams;
  const selectedDestinoId = params.destino_id || user.destinoId;

  // Super admin ve selector de destino; admin local solo ve su destino
  if (user.isSuperAdmin) {
    const destinos = await listDestinosAdmin();
    let rubros: any = [];
    let datosUtiles: any = [];
    let itemCounts: Map<string, number> = new Map();

    if (selectedDestinoId) {
      const [r, d] = await Promise.all([
        listRubros(),
        listDatosUtilesByDestino(selectedDestinoId),
      ]);
      rubros = r;
      datosUtiles = d;
      itemCounts = await countItemsByRubro(selectedDestinoId);
    }

    return (
      <DatosUtilesSuperAdminView
        destinos={destinos}
        selectedDestinoId={selectedDestinoId || null}
        selectedRubros={rubros}
        selectedDatosUtiles={datosUtiles}
        selectedItemCounts={itemCounts}
      />
    );
  }

  // Admin local: usa su destino asignado
  if (!user.destinoId) {
    return (
      <div className="max-w-4xl space-y-6">
        <header>
          <h1 className="font-display text-3xl tracking-tight">Datos Útiles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No tienes un destino asignado.
          </p>
        </header>
      </div>
    );
  }

  const [rubros, datosUtiles] = await Promise.all([
    listRubros(),
    listDatosUtilesByDestino(user.destinoId),
  ]);

  const itemCounts = await countItemsByRubro(user.destinoId);

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Datos Útiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Información local para visitantes del destino
        </p>
      </header>

      <DatosUtilesPanel
        destinoId={user.destinoId}
        rubros={rubros}
        datosUtiles={datosUtiles}
        itemCounts={itemCounts}
      />
    </div>
  );
}
