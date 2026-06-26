import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireResponsable } from "@/features/panel/lib/auth";
import { getLugarById } from "@/features/lugares/lib/queries";
import { getResponsableLugarIds } from "@/features/lugares/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { LugarFotosManager } from "@/features/admin/components/LugarFotosManager";
import { LugarResponsableEstadoBar } from "@/features/panel/components/LugarResponsableEstadoBar";
import { updateLugarAsResponsableAction } from "@/features/lugares/lib/actions";

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
  params: Promise<{ id: string }>;
}

export default async function MiLugarEditPage({ params }: PageProps) {
  const user = await requireResponsable();
  const { id } = await params;

  // Scope: el responsable solo puede editar lugares de los que es dueño.
  const ownedIds = await getResponsableLugarIds(user.id);
  if (!ownedIds.includes(id)) notFound();

  const lugar = await getLugarById(id);
  if (!lugar) notFound();
  const tipo = lugar.tipo as "gastronomico" | "atractivo";

  const destinos = await listDestinosActivos();

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", tipo);
    return updateLugarAsResponsableAction(id, fd);
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
          {lugar.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editá tus datos. Cualquier cambio sobre un local ya publicado lo
          deja en revisión hasta que el admin lo apruebe de nuevo.
        </p>
      </div>

      <LugarResponsableEstadoBar
        lugarId={lugar.id}
        estado={lugar.estado}
        notasRechazo={lugar.notas_rechazo}
      />

      <LugarFotosManager
        lugarId={lugar.id}
        fotos={lugar.lugar_fotos}
        tipo={tipo}
      />

      <LugarForm
        tipo={tipo}
        destinos={destinos}
        initial={lugar}
        submitLabel="Guardar cambios"
        action={action}
        mode="responsable"
      />
    </div>
  );
}
