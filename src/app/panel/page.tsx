import Link from "next/link";
import {
  Plus,
  Building2,
  Utensils,
  FileText,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
} from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { listMyHospedajes } from "@/features/panel/lib/queries";
import { listLugaresDelResponsable } from "@/features/lugares/lib/queries";
import { buttonVariants } from "@/components/ui/button";
import type { EstadoHospedaje, EstadoLugar } from "@/types/database";

const ESTADO_INFO: Record<
  EstadoHospedaje | EstadoLugar,
  { label: string; icon: typeof Building2; tone: string }
> = {
  borrador: { label: "Borrador", icon: FileText, tone: "text-slate-700" },
  pendiente_validacion: {
    label: "Pendiente de revisión",
    icon: Clock,
    tone: "text-amber-700",
  },
  publicado: {
    label: "Publicado",
    icon: CheckCircle2,
    tone: "text-emerald-700",
  },
  pausado: { label: "Pausado", icon: Pause, tone: "text-blue-700" },
  rechazado: { label: "Rechazado", icon: XCircle, tone: "text-rose-700" },
};

export default async function PanelDashboardPage() {
  const user = await requireResponsable();
  const [hospedajes, lugares] = await Promise.all([
    listMyHospedajes(user.perfil.hospedajes_ids ?? []),
    listLugaresDelResponsable(user.id),
  ]);

  const sinEntidades = hospedajes.length === 0 && lugares.length === 0;

  return (
    <div className="max-w-5xl space-y-10">
      <header>
        <p className="text-sm text-muted-foreground">
          Hola {user.perfil.nombre ?? user.email}
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">Mi panel</h1>
        <p className="mt-2 text-muted-foreground">
          Gestioná tus hospedajes y gastronómicos en Mis Escapadas.
        </p>
      </header>

      {sinEntidades && (
        <section className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Building2
            className="mx-auto h-10 w-10 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-display text-xl tracking-tight">
            Todavía no cargaste nada
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Empezá creando tu primer hospedaje o gastronómico. Vas a poder
            cargar datos, fotos y enviar a revisión.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/panel/hospedajes/nuevo"
              className={buttonVariants({ size: "lg" })}
            >
              <Building2 className="h-4 w-4" />
              Cargar hospedaje
            </Link>
            <Link
              href="/panel/lugares/nuevo"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              <Utensils className="h-4 w-4" />
              Cargar gastronómico
            </Link>
          </div>
        </section>
      )}

      {hospedajes.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
              <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
              Mis hospedajes
            </h2>
            <Link
              href="/panel/hospedajes/nuevo"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </Link>
          </div>

          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {hospedajes.map((h) => {
              const info = ESTADO_INFO[h.estado];
              const Icon = info.icon;
              return (
                <li key={h.id}>
                  <Link
                    href={`/panel/hospedajes/${h.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{h.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.destino_nombre}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${info.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                      {info.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {lugares.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 font-display text-2xl tracking-tight">
              <Utensils className="h-5 w-5 text-muted-foreground" aria-hidden />
              Mis gastronómicos
            </h2>
            <Link
              href="/panel/lugares/nuevo"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </Link>
          </div>

          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {lugares.map((l) => {
              const info = ESTADO_INFO[l.estado];
              const Icon = info.icon;
              return (
                <li key={l.id}>
                  <Link
                    href={`/panel/lugares/${l.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{l.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.categoria}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-sm ${info.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                      {info.label}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
