import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  getResponsableWithComerciosAction,
} from "@/features/admin/lib/responsable-management";
import { ResponsableComerciosList } from "@/features/admin/components/ResponsableComerciosList";

export default async function ResponsableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const responsable = await getResponsableWithComerciosAction(id);

  if (!responsable) {
    return (
      <div className="max-w-5xl space-y-4">
        <Link
          href="/admin/responsables"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a responsables
        </Link>
        <p className="text-sm text-muted-foreground">
          El responsable no existe o no tenés acceso.
        </p>
      </div>
    );
  }

  // Contar comercios por estado
  const estadoCounts = {
    borrador: responsable.comercios.filter((c) => c.estado === "borrador").length,
    pendiente_validacion: responsable.comercios.filter(
      (c) => c.estado === "pendiente_validacion"
    ).length,
    publicado: responsable.comercios.filter((c) => c.estado === "publicado").length,
    pausado: responsable.comercios.filter((c) => c.estado === "pausado").length,
    rechazado: responsable.comercios.filter((c) => c.estado === "rechazado").length,
  };

  return (
    <div className="max-w-5xl space-y-8">
      <Link
        href="/admin/responsables"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a responsables
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight">
          {responsable.nombre || "Responsable sin nombre"}
        </h1>
        <p className="text-sm text-muted-foreground">{responsable.email}</p>
      </header>

      {/* Resumen de estados */}
      {responsable.comercios.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Resumen de comercios</h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {estadoCounts.borrador > 0 && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-2xl font-bold text-slate-900">
                  {estadoCounts.borrador}
                </p>
                <p className="text-xs text-slate-700">Borradores</p>
              </div>
            )}
            {estadoCounts.pendiente_validacion > 0 && (
              <div className="rounded-lg bg-yellow-50 p-3">
                <p className="text-2xl font-bold text-yellow-900">
                  {estadoCounts.pendiente_validacion}
                </p>
                <p className="text-xs text-yellow-700">Pendientes</p>
              </div>
            )}
            {estadoCounts.publicado > 0 && (
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-2xl font-bold text-emerald-900">
                  {estadoCounts.publicado}
                </p>
                <p className="text-xs text-emerald-700">Publicados</p>
              </div>
            )}
            {estadoCounts.pausado > 0 && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-2xl font-bold text-blue-900">
                  {estadoCounts.pausado}
                </p>
                <p className="text-xs text-blue-700">Pausados</p>
              </div>
            )}
            {estadoCounts.rechazado > 0 && (
              <div className="rounded-lg bg-rose-50 p-3">
                <p className="text-2xl font-bold text-rose-900">
                  {estadoCounts.rechazado}
                </p>
                <p className="text-xs text-rose-700">Rechazados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de comercios */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold">Comercios</h2>
        <ResponsableComerciosList comercios={responsable.comercios} />
      </section>
    </div>
  );
}
