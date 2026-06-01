import { getHeaderSession } from "@/features/home/lib/header-session";
import { DestinoTopBar } from "./DestinoTopBar";

/**
 * Header de las páginas internas del destino. Wrapper server que resuelve la
 * sesión (para el UserMenu) y delega el shell visual a DestinoTopBar. Drop-in
 * del antiguo Header: misma firma `{ destinoSlug, destinoNombre }`.
 */
export async function DestinoHeader({
  destinoSlug,
  destinoNombre,
}: {
  destinoSlug: string;
  destinoNombre: string;
}) {
  const session = await getHeaderSession();
  return (
    <DestinoTopBar
      destinoSlug={destinoSlug}
      destinoNombre={destinoNombre}
      session={session}
    />
  );
}
