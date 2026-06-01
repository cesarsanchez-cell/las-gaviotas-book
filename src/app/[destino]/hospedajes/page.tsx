import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ destino: string }>;
}

/**
 * El listado por vertical quedó superado por el hub del destino. Redirige al hub
 * con la vertical de hospedajes preseleccionada (misma experiencia que la home).
 */
export default async function HospedajesListadoPage({ params }: PageProps) {
  const { destino } = await params;
  redirect(`/${destino}?v=hospedajes`);
}
