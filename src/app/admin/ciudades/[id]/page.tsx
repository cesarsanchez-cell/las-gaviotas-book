import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { CiudadForm } from "@/features/admin/components/CiudadForm";
import {
  getCiudad,
  updateCiudadAction,
} from "@/features/admin/lib/ciudad-management";
import { listRegionesAdmin } from "@/features/regiones/lib/queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCiudadPage({ params }: PageProps) {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/ciudades");

  const { id } = await params;
  const [ciudad, regiones] = await Promise.all([
    getCiudad(id),
    listRegionesAdmin(),
  ]);
  if (!ciudad) notFound();

  const action = updateCiudadAction.bind(null, id);

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
          {ciudad.nombre}
        </h1>
      </div>

      <CiudadForm
        ciudad={ciudad}
        regiones={regiones}
        action={action}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
