import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listPromosAdmin } from "@/features/promos/lib/queries";
import { PromoTable } from "@/features/promos/components/PromoTable";
import { buttonVariants } from "@/components/ui/button";

export default async function PromosAdminPage() {
  const admin = await requireAdmin();
  const rows = await listPromosAdmin(admin.destinoId);

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Promos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Descuentos y beneficios sobre un comercio. Aparecen en las bandas de
            promos de la home y dentro del destino.
          </p>
        </div>
        <Link href="/admin/promos/nueva" className={buttonVariants({ size: "default" })}>
          <Plus className="h-4 w-4" />
          Nueva promo
        </Link>
      </header>

      <PromoTable rows={rows} basePath="/admin/promos" />
    </div>
  );
}
