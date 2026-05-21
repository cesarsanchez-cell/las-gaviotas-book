import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { RegionForm } from "@/features/admin/components/RegionForm";
import { createRegionAction } from "@/features/admin/lib/region-management";

export default async function NuevaRegionPage() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) redirect("/admin/regiones");

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
          Nueva región
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Las regiones son curadas — agrupan destinos por afinidad cultural y
          geográfica.
        </p>
      </div>

      <RegionForm action={createRegionAction} submitLabel="Crear región" />
    </div>
  );
}
