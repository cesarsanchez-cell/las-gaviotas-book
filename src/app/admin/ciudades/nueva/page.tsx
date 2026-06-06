import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { CiudadForm } from "@/features/admin/components/CiudadForm";
import { createCiudadAction } from "@/features/admin/lib/ciudad-management";
import { listRegionesAdmin } from "@/features/regiones/lib/queries";

export default async function NuevaCiudadPage() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/ciudades");

  const regiones = await listRegionesAdmin();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/ciudades"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a ciudades
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Nueva ciudad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrupá destinos cercanos bajo una ciudad dentro de una región.
        </p>
      </div>

      <CiudadForm
        action={createCiudadAction}
        regiones={regiones}
        submitLabel="Crear ciudad"
      />
    </div>
  );
}
