import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { createLugarAsResponsableAction } from "@/features/lugares/lib/actions";

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

export default async function NuevoLugarResponsablePage() {
  await requireResponsable();
  const destinos = await listDestinosActivos();

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", "gastronomico");
    const r = await createLugarAsResponsableAction(fd);
    if (r?.ok && r?.id) redirect(`/panel/lugares/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/panel"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al panel
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          Cargar mi gastronómico
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Llená los datos básicos. Cuando esté listo, lo enviás a validación
          y el admin local del destino lo aprueba.
        </p>
      </div>

      <LugarForm
        tipo="gastronomico"
        destinos={destinos}
        submitLabel="Crear gastronómico"
        action={action}
        mode="responsable"
      />
    </div>
  );
}
