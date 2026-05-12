import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  Pause,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { getAdminStats } from "@/features/admin/lib/queries";
import { cn } from "@/lib/utils";

const ESTADOS = [
  {
    key: "publicados",
    label: "Publicados",
    icon: CheckCircle2,
    href: "/admin/hospedajes?estado=publicado",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    key: "pendientes",
    label: "Pendientes de validación",
    icon: Clock,
    href: "/admin/hospedajes?estado=pendiente_validacion",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    key: "borradores",
    label: "Borradores",
    icon: FileText,
    href: "/admin/hospedajes?estado=borrador",
    tone: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    key: "pausados",
    label: "Pausados",
    icon: Pause,
    href: "/admin/hospedajes?estado=pausado",
    tone: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    key: "rechazados",
    label: "Rechazados",
    icon: XCircle,
    href: "/admin/hospedajes?estado=rechazado",
    tone: "bg-rose-50 text-rose-700 border-rose-200",
  },
] as const;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const stats = await getAdminStats();

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">
          Hola {admin.perfil.nombre ?? admin.email}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Resumen del estado actual de los hospedajes.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Hospedajes por estado
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ESTADOS.map((e) => {
            const Icon = e.icon;
            const value = stats[e.key as keyof typeof stats];
            return (
              <Link
                key={e.key}
                href={e.href}
                className={cn(
                  "block rounded-xl border bg-card p-5 transition hover:shadow-md",
                  e.tone
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5" aria-hidden />
                  <ArrowRight className="h-4 w-4 opacity-50" aria-hidden />
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums">
                  {value}
                </p>
                <p className="mt-1 text-sm">{e.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl tracking-tight">Acciones rápidas</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/hospedajes/nuevo"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Nuevo hospedaje
          </Link>
          <Link
            href="/admin/hospedajes"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Ver todos los hospedajes
          </Link>
        </div>
      </section>
    </div>
  );
}
