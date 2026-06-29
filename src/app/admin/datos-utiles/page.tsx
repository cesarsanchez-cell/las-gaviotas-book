import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listRubros,
  listDatosUtilesByDestino,
  countItemsByRubro,
} from "@/features/datos-utiles/lib/queries";
import { DatosUtilesPanel } from "@/features/datos-utiles/components/DatosUtilesPanel";

export default async function DatosUtilesPage() {
  const user = await requireAdmin();

  if (!user.destinoId) notFound();

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
