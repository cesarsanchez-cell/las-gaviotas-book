import { requireAdmin } from "@/features/admin/lib/auth";
import {
  listRubros,
  listDatosUtilesByDestino,
  listDatosUtilesByCiudad,
  listDatosUtilesByZona,
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
    const [destinos, ciudades, zonas, rubros, destinosZona] = await Promise.all([
      listDestinosAdmin(),
      listCiudadesAdmin(),
      listZonasAdmin(),
      listRubros(),
      getDestinosByZona(),
    ]);

    // Cargar todos los datos de ciudad/zona/destino en paralelo
    const [datosCiudades, datosZonas, datosDestinos] = await Promise.all([
      Promise.all(ciudades.map((c) => listDatosUtilesByCiudad(c.id))),
      Promise.all(zonas.map((z) => listDatosUtilesByZona(z.id))),
      Promise.all(destinos.map((d) => listDatosUtilesByDestino(d.id))),
    ]);

    // Agrupar por scope_id para acceso rápido
    const datosMap = new Map<string, DatoUtil[]>();
    ciudades.forEach((c, i) => datosMap.set(`ciudad:${c.id}`, datosCiudades[i]));
    zonas.forEach((z, i) => datosMap.set(`zona:${z.id}`, datosZonas[i]));
    destinos.forEach((d, i) => datosMap.set(`destino:${d.id}`, datosDestinos[i]));

    return (
      <DatosUtilesSuperAdminView
        destinos={destinos}
        ciudades={ciudades}
        zonas={zonas}
        rubros={rubros}
        datosMap={datosMap}
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
        itemCounts={new Map()}
      />
    </div>
  );
}
