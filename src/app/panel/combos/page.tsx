import Link from "next/link";
import { Plus } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { listCombosDelResponsable } from "@/features/combos/lib/queries";
import { ComboTable } from "@/features/combos/components/ComboTable";
import { buttonVariants } from "@/components/ui/button";

export default async function MisCombosPage() {
  const resp = await requireResponsable();
  const rows = await listCombosDelResponsable(resp.id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Mis combos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escapadas armadas cruzando 2-3 comercios. Las armás vos y el admin las
            aprueba antes de publicarlas.
          </p>
        </div>
        <Link href="/panel/combos/nueva" className={buttonVariants({ size: "default" })}>
          <Plus className="h-4 w-4" />
          Nuevo combo
        </Link>
      </header>

      <ComboTable rows={rows} basePath="/panel/combos" />
    </div>
  );
}
