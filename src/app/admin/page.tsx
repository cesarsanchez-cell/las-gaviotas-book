import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Pause,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Building2,
  Utensils,
  Camera,
} from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { getAdminStats } from "@/features/admin/lib/queries";
import { getLugaresStats } from "@/features/admin/lib/lugar-queries";
import { cn } from "@/lib/utils";

interface CardStat {
  key: string;
  label: string;
  value: number;
  icon: typeof CheckCircle2;
  href: string;
  tone: string;
}

function StatGrid({ items }: { items: CardStat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.key}
            href={it.href}
            className={cn(
              "block rounded-xl border bg-card p-4 transition hover:shadow-md",
              it.tone
            )}
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4" aria-hidden />
              <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {it.value}
            </p>
            <p className="mt-0.5 text-xs">{it.label}</p>
          </Link>
        );
      })}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [hostStats, gastroStats, atrStats] = await Promise.all([
    getAdminStats(admin.destinoId),
    getLugaresStats("gastronomico", admin.destinoId),
    getLugaresStats("atractivo", admin.destinoId),
  ]);

  const totalPendientes = hostStats.pendientes + gastroStats.pendientes;

  const hospedajeItems: CardStat[] = [
    {
      key: "h-pub",
      label: "Publicados",
      value: hostStats.publicados,
      icon: CheckCircle2,
      href: "/admin/hospedajes?estado=publicado",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "h-pend",
      label: "Pendientes",
      value: hostStats.pendientes,
      icon: Clock,
      href: "/admin/hospedajes?estado=pendiente_validacion",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      key: "h-bor",
      label: "Borradores",
      value: hostStats.borradores,
      icon: FileText,
      href: "/admin/hospedajes?estado=borrador",
      tone: "bg-slate-50 text-slate-700 border-slate-200",
    },
    {
      key: "h-paus",
      label: "Pausados",
      value: hostStats.pausados,
      icon: Pause,
      href: "/admin/hospedajes?estado=pausado",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      key: "h-rech",
      label: "Rechazados",
      value: hostStats.rechazados,
      icon: XCircle,
      href: "/admin/hospedajes?estado=rechazado",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  const gastroItems: CardStat[] = [
    {
      key: "g-pub",
      label: "Publicados",
      value: gastroStats.publicados,
      icon: CheckCircle2,
      href: "/admin/gastronomia?estado=publicado",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "g-pend",
      label: "Pendientes",
      value: gastroStats.pendientes,
      icon: Clock,
      href: "/admin/gastronomia?estado=pendiente_validacion",
      tone: "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
      key: "g-bor",
      label: "Borradores",
      value: gastroStats.borradores,
      icon: FileText,
      href: "/admin/gastronomia?estado=borrador",
      tone: "bg-slate-50 text-slate-700 border-slate-200",
    },
    {
      key: "g-paus",
      label: "Pausados",
      value: gastroStats.pausados,
      icon: Pause,
      href: "/admin/gastronomia?estado=pausado",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      key: "g-rech",
      label: "Rechazados",
      value: gastroStats.rechazados,
      icon: XCircle,
      href: "/admin/gastronomia?estado=rechazado",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    },
  ];

  const atractivoItems: CardStat[] = [
    {
      key: "a-pub",
      label: "Publicados",
      value: atrStats.publicados,
      icon: CheckCircle2,
      href: "/admin/atractivos?estado=publicado",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "a-bor",
      label: "Borradores",
      value: atrStats.borradores,
      icon: FileText,
      href: "/admin/atractivos?estado=borrador",
      tone: "bg-slate-50 text-slate-700 border-slate-200",
    },
    {
      key: "a-paus",
      label: "Pausados",
      value: atrStats.pausados,
      icon: Pause,
      href: "/admin/atractivos?estado=pausado",
      tone: "bg-blue-50 text-blue-700 border-blue-200",
    },
  ];

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">
          Hola {admin.perfil.nombre ?? admin.email}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Resumen del destino — qué necesita atención y qué está publicado.
        </p>
      </header>

      {totalPendientes > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden
            />
            <div className="flex-1">
              <h2 className="font-display text-lg tracking-tight text-amber-900">
                Necesitan tu OK
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Hay {totalPendientes}{" "}
                {totalPendientes === 1 ? "ítem" : "ítems"} esperando que los
                valides.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {hostStats.pendientes > 0 && (
                  <Link
                    href="/admin/validaciones"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                  >
                    <Building2 className="h-4 w-4" />
                    {hostStats.pendientes}{" "}
                    {hostStats.pendientes === 1 ? "hospedaje" : "hospedajes"}
                  </Link>
                )}
                {gastroStats.pendientes > 0 && (
                  <Link
                    href="/admin/validaciones"
                    className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                  >
                    <Utensils className="h-4 w-4" />
                    {gastroStats.pendientes}{" "}
                    {gastroStats.pendientes === 1
                      ? "gastronómico"
                      : "gastronómicos"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <header className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Hospedajes
          </h2>
        </header>
        <StatGrid items={hospedajeItems} />
      </section>

      <section>
        <header className="mb-3 flex items-center gap-2">
          <Utensils className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Gastronomía
          </h2>
        </header>
        <StatGrid items={gastroItems} />
      </section>

      <section>
        <header className="mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Atractivos
          </h2>
        </header>
        <StatGrid items={atractivoItems} />
        <p className="mt-2 text-xs text-muted-foreground">
          Los atractivos los cargás y publicás vos — no pasan por validación.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl tracking-tight">
          Acciones rápidas
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/hospedajes/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Building2 className="h-4 w-4" />
            Nuevo hospedaje
          </Link>
          <Link
            href="/admin/gastronomia/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Utensils className="h-4 w-4" />
            Nuevo gastronómico
          </Link>
          <Link
            href="/admin/atractivos/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
            Nuevo atractivo
          </Link>
          <Link
            href="/admin/validaciones"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cola de validación
          </Link>
        </div>
      </section>
    </div>
  );
}
