import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listHospedajesAdmin } from "@/features/admin/lib/queries";
import { HospedajeTable } from "@/features/admin/components/HospedajeTable";
import { buttonVariants } from "@/components/ui/button";
import type { EstadoHospedaje } from "@/types/database";

const ESTADOS_TABS: { value: EstadoHospedaje | "all"; label: string }[] = [
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

export default async function HospedajesAdminPage({ searchParams }: PageProps) {
  await requireAdmin();
  const sp = await searchParams;
  const estadoFilter = sp.estado as EstadoHospedaje | undefined;

  const rows = await listHospedajesAdmin(estadoFilter);

  return (
    <div className="max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Hospedajes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestión de alojamientos del directorio.
          </p>
        </div>
        <Link
          href="/admin/hospedajes/nuevo"
          className={buttonVariants({ size: "default" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo hospedaje
        </Link>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {ESTADOS_TABS.map((t) => {
          const active =
            (t.value === "all" && !estadoFilter) || t.value === estadoFilter;
          const href =
            t.value === "all"
              ? "/admin/hospedajes"
              : `/admin/hospedajes?estado=${t.value}`;
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

      <HospedajeTable rows={rows} />
    </div>
  );
}
