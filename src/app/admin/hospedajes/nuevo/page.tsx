import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listDestinosForSelect } from "@/features/admin/lib/queries";
import { InvitacionFormulario } from "./components/invitacion-formulario";

interface NuevoHospedajePageProps {
  searchParams?: Promise<{ destino_id?: string }>;
}

export default async function NuevoHospedajePage({
  searchParams,
}: NuevoHospedajePageProps) {
  const admin = await requireAdmin();

  const params = await (searchParams ?? Promise.resolve({ destino_id: "" }));
  let destinoId = params.destino_id || "";

  // Si es admin local, usar su destino automáticamente
  if (!admin.isSuperAdmin && admin.destinoId) {
    destinoId = admin.destinoId;
  }

  // Super admin necesita elegir destino
  const destinos = await listDestinosForSelect();
  const destinosDisponibles = admin.isSuperAdmin
    ? destinos
    : destinos.filter((d) => d.id === admin.destinoId);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link
          href="/admin/hospedajes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a hospedajes
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight">
          Invitar responsable
        </h1>
      </header>

      <InvitacionFormulario
        destinoId={destinoId}
        destinos={destinosDisponibles}
        isSuperAdmin={admin.isSuperAdmin}
      />
    </div>
  );
}
