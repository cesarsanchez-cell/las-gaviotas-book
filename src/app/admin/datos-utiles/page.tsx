import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listRubros,
  listDatosUtilesByDestino,
  listDatosUtilesByCiudad,
  listDatosUtilesByZona,
  countItemsByRubro,
  countItemsByRubroCiudad,
  countItemsByRubroZona,
  getDestinosByZona,
} from "@/features/datos-utiles/lib/queries";
import { DatosUtilesPanel } from "@/features/datos-utiles/components/DatosUtilesPanel";
import { DatosUtilesSuperAdminView } from "@/features/datos-utiles/components/DatosUtilesSuperAdminView";
import { listDestinosAdmin } from "@/features/admin/lib/destino-management";
import { listCiudadesAdmin } from "@/features/admin/lib/ciudad-management";
import { listZonasAdmin } from "@/features/admin/lib/zona-management";
import type { Rubro, DatoUtil } from "@/lib/types";

type ScopeType = "destino" | "zona" | "ciudad";

interface PageProps {
  searchParams: Promise<{ scope_type?: string; scope_id?: string; destino_id?: string }>;
}

export default async function DatosUtilesPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const params = await searchParams;

  // Mantener backward compatibility con destino_id
  const scopeTypeParam = (params.scope_type || "destino") as ScopeType;
  const scopeIdParam = params.scope_id || params.destino_id || null;

  // Super admin ve selector de scope; admin local solo ve su destino
  if (user.isSuperAdmin) {
    const [destinos, ciudades, zonas, destinosZona] = await Promise.all([
      listDestinosAdmin(),
      listCiudadesAdmin(),
      listZonasAdmin(),
      getDestinosByZona(),
    ]);

    let rubros: Rubro[] = [];
    let datosUtiles: DatoUtil[] = [];
    let itemCounts: Map<string, number> = new Map();

    if (scopeIdParam) {
      const [r] = await Promise.all([listRubros()]);
      rubros = r;

      if (scopeTypeParam === "destino") {
        const [d, counts] = await Promise.all([
          listDatosUtilesByDestino(scopeIdParam),
          countItemsByRubro(scopeIdParam),
        ]);
        datosUtiles = d;
        itemCounts = counts;
      } else if (scopeTypeParam === "ciudad") {
        const [d, counts] = await Promise.all([
          listDatosUtilesByCiudad(scopeIdParam),
          countItemsByRubroCiudad(scopeIdParam),
        ]);
        datosUtiles = d;
        itemCounts = counts;
      } else if (scopeTypeParam === "zona") {
        const [d, counts] = await Promise.all([
          listDatosUtilesByZona(scopeIdParam),
          countItemsByRubroZona(scopeIdParam),
        ]);
        datosUtiles = d;
        itemCounts = counts;
      }
    }

    return (
      <DatosUtilesSuperAdminView
        destinos={destinos}
        ciudades={ciudades}
        zonas={zonas}
        selectedScopeType={scopeTypeParam}
        selectedScopeId={scopeIdParam}
        selectedRubros={rubros}
        selectedDatosUtiles={datosUtiles}
        selectedItemCounts={itemCounts}
        destinosZona={destinosZona}
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
