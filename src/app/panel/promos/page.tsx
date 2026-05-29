import Link from "next/link";
import { Plus } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { listPromosDelResponsable } from "@/features/promos/lib/queries";
import { PromoTable } from "@/features/promos/components/PromoTable";
import { buttonVariants } from "@/components/ui/button";

export default async function MisPromosPage() {
  const resp = await requireResponsable();
  const rows = await listPromosDelResponsable(resp.hospedajeIds, resp.lugarIds);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Mis promos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Descuentos y beneficios sobre tus comercios. Se muestran al público
            mientras estén activas y vigentes.
          </p>
        </div>
        <Link href="/panel/promos/nueva" className={buttonVariants({ size: "default" })}>
          <Plus className="h-4 w-4" />
          Nueva promo
        </Link>
      </header>

      <PromoTable rows={rows} basePath="/panel/promos" />
    </div>
  );
}
