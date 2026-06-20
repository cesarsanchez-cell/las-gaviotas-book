import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { ZonaForm } from "@/features/admin/components/ZonaForm";
import {
  getZona,
  updateZonaAction,
  listDestinosParaZonas,
  listAdminsParaCurador,
} from "@/features/admin/lib/zona-management";
import { listCiudadesAdmin } from "@/features/admin/lib/ciudad-management";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditZonaPage({ params }: PageProps) {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/zonas");

  const { id } = await params;
  const [data, destinos, curadores, ciudades] = await Promise.all([
    getZona(id),
    listDestinosParaZonas(),
    listAdminsParaCurador(),
    listCiudadesAdmin(),
  ]);
  if (!data) notFound();

  const action = updateZonaAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/zonas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a zonas
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {data.zona.nombre}
        </h1>
      </div>

      <ZonaForm
        zona={data.zona}
        selectedDestinoIds={data.destinoIds}
        action={action}
        destinos={destinos}
        curadores={curadores}
        ciudades={ciudades.map((c) => ({ id: c.id, nombre: c.nombre }))}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
