import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listCombosAdmin } from "@/features/combos/lib/queries";
import { ComboTable } from "@/features/combos/components/ComboTable";
import { buttonVariants } from "@/components/ui/button";
import type { EstadoCombo } from "@/types/database";

const ESTADOS_TABS: { value: EstadoCombo | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "publicado", label: "Publicados" },
  { value: "pendiente_validacion", label: "Pendientes" },
  { value: "borrador", label: "Borradores" },
  { value: "pausado", label: "Pausados" },
  { value: "rechazado", label: "Rechazados" },
];

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function CombosAdminPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const estadoFilter = sp.estado as EstadoCombo | undefined;

  const rows = await listCombosAdmin(admin.destinoId, estadoFilter);

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Combos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escapadas armadas que cruzan 2-3 comercios. Las arma el responsable y
            vos las aprobás.
          </p>
        </div>
        <Link href="/admin/combos/nueva" className={buttonVariants({ size: "default" })}>
          <Plus className="h-4 w-4" />
          Nuevo combo
        </Link>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {ESTADOS_TABS.map((t) => {
          const active =
            (t.value === "all" && !estadoFilter) || t.value === estadoFilter;
          const href =
            t.value === "all" ? "/admin/combos" : `/admin/combos?estado=${t.value}`;
          return (
            <Link
              key={t.value}
              href={href}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <ComboTable rows={rows} basePath="/admin/combos" />
    </div>
  );
}
