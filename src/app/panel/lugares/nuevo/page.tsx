import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UtensilsCrossed, Compass } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { createLugarAsResponsableAction } from "@/features/lugares/lib/actions";
import type { TipoLugar } from "@/types/database";

async function listDestinosActivos(): Promise<
  { id: string; nombre: string; slug: string }[]
> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("destinos")
    .select("id, nombre, slug")
    .eq("activo", true)
    .order("nombre", { ascending: true });
  return (data ?? []) as { id: string; nombre: string; slug: string }[];
}

interface PageProps {
  searchParams: Promise<{ tipo?: string }>;
}

export default async function NuevoLugarResponsablePage({
  searchParams,
}: PageProps) {
  await requireResponsable();
  const { tipo: tipoParam } = await searchParams;
  const tipo: TipoLugar | null =
    tipoParam === "atractivo" || tipoParam === "gastronomico"
      ? tipoParam
      : null;

  // Sin tipo elegido: pantalla de elección (gastronómico vs qué hacer).
  if (!tipo) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al panel
          </Link>
          <h1 className="mt-2 font-display text-3xl tracking-tight">
            ¿Qué querés cargar?
          </h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/panel/lugares/nuevo?tipo=gastronomico"
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <UtensilsCrossed className="h-6 w-6 text-primary" aria-hidden />
            <span className="font-display text-xl tracking-tight">
              Gastronómico
            </span>
            <span className="text-sm text-muted-foreground">
              Restaurante, bar, parador, café.
            </span>
          </Link>
          <Link
            href="/panel/lugares/nuevo?tipo=atractivo"
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-secondary/40"
          >
            <Compass className="h-6 w-6 text-primary" aria-hidden />
            <span className="font-display text-xl tracking-tight">
              Qué hacer
            </span>
            <span className="text-sm text-muted-foreground">
              Actividad o experiencia: cabalgatas, excursiones, paseos,
              alquileres.
            </span>
          </Link>
        </div>
      </div>
    );
  }

  const destinos = await listDestinosActivos();
  const esGastro = tipo === "gastronomico";

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", tipo as string);
    const r = await createLugarAsResponsableAction(fd);
    if (r?.ok && r?.id) redirect(`/panel/lugares/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/panel/lugares/nuevo"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Cambiar tipo
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {esGastro ? "Cargar mi gastronómico" : "Cargar mi actividad"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Llená los datos básicos. Cuando esté listo, lo enviás a validación y el
          admin local del destino lo aprueba.
        </p>
      </div>

      <LugarForm
        tipo={tipo}
        destinos={destinos}
        submitLabel={esGastro ? "Crear gastronómico" : "Crear actividad"}
        action={action}
        mode="responsable"
      />
    </div>
  );
}
