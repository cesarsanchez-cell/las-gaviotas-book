import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { ZonaForm } from "@/features/admin/components/ZonaForm";
import {
  createZonaAction,
  listDestinosParaZonas,
  listAdminsParaCurador,
} from "@/features/admin/lib/zona-management";
import { listCiudadesAdmin } from "@/features/admin/lib/ciudad-management";

export default async function NuevaZonaPage() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/zonas");

  const [destinos, curadores, ciudades] = await Promise.all([
    listDestinosParaZonas(),
    listAdminsParaCurador(),
    listCiudadesAdmin(),
  ]);

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
        <h1 className="mt-2 font-display text-3xl tracking-tight">Nueva zona</h1>
      </div>

      <ZonaForm
        action={createZonaAction}
        destinos={destinos}
        curadores={curadores}
        ciudades={ciudades.map((c) => ({ id: c.id, nombre: c.nombre }))}
        submitLabel="Crear zona"
      />
    </div>
  );
}
