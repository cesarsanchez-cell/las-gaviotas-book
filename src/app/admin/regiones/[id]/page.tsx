import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { RegionForm } from "@/features/admin/components/RegionForm";
import {
  getRegion,
  updateRegionAction,
} from "@/features/admin/lib/region-management";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRegionPage({ params }: PageProps) {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/regiones");

  const { id } = await params;
  const region = await getRegion(id);
  if (!region) notFound();

  const action = updateRegionAction.bind(null, id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link
          href="/admin/regiones"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a regiones
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {region.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editá los datos. Los cambios se reflejan en la home pública.
        </p>
      </div>

      <RegionForm
        region={region}
        action={action}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
