import { getHeaderSession } from "@/features/home/lib/header-session";
import { DestinoTopBar } from "./DestinoTopBar";
import {
  listRubros,
  listDatosUtilesByDestino,
} from "@/features/datos-utiles/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Header de las páginas internas del destino. Wrapper server que resuelve la
 * sesión (para el UserMenu) y delega el shell visual a DestinoTopBar. Drop-in
 * del antiguo Header: misma firma `{ destinoSlug, destinoNombre }`.
 */
export async function DestinoHeader({
  destinoSlug,
  destinoNombre,
  destinoId,
}: {
  destinoSlug: string;
  destinoNombre: string;
  destinoId: string;
}) {
  const [session, rubros, datosUtiles] = await Promise.all([
    getHeaderSession(),
    listRubros(),
    listDatosUtilesByDestino(destinoId),
  ]);

  return (
    <DestinoTopBar
      destinoSlug={destinoSlug}
      destinoNombre={destinoNombre}
      session={session}
      rubros={rubros}
      datosUtiles={datosUtiles}
    />
  );
}
