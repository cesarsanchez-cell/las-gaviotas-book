import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listLugaresAdminConDestino } from "@/features/admin/lib/lugar-queries";
import { LugarTable } from "@/features/admin/components/LugarTable";
import { buttonVariants } from "@/components/ui/button";
import type { EstadoLugar } from "@/types/database";

const ESTADOS_TABS: { value: EstadoLugar | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "publicado", label: "Publicados" },
  { value: "borrador", label: "Borradores" },
  { value: "pausado", label: "Pausados" },
];

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function AtractivosAdminPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const estadoFilter = sp.estado as EstadoLugar | undefined;

  const rows = await listLugaresAdminConDestino(
    "atractivo",
    admin.destinoId,
    estadoFilter
  );

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Atractivos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Playas, bosques, miradores, espacios culturales, lugares
            recomendados del destino. Los gestionás vos como admin local.
          </p>
        </div>
        <Link
          href="/admin/atractivos/nuevo"
          className={buttonVariants({ size: "default" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo atractivo
        </Link>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {ESTADOS_TABS.map((t) => {
          const active =
            (t.value === "all" && !estadoFilter) || t.value === estadoFilter;
          const href =
            t.value === "all"
              ? "/admin/atractivos"
              : `/admin/atractivos?estado=${t.value}`;
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

      <LugarTable rows={rows} tipo="atractivo" basePath="/admin/atractivos" />
    </div>
  );
}
