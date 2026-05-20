import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { getLugarById } from "@/features/lugares/lib/queries";
import { listDestinosParaSelect } from "@/features/admin/lib/lugar-queries";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { LugarEstadoActions } from "@/features/admin/components/LugarEstadoActions";
import { LugarFotosManager } from "@/features/admin/components/LugarFotosManager";
import { updateLugarAsAdminAction } from "@/features/lugares/lib/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAtractivoPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const lugar = await getLugarById(id);
  if (!lugar || lugar.tipo !== "atractivo") notFound();
  if (!admin.isSuperAdmin && lugar.destino_id !== admin.destinoId) notFound();

  const destinos = await listDestinosParaSelect(admin.destinoId);

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", "atractivo");
    return updateLugarAsAdminAction(id, fd);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/atractivos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Atractivos
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {lugar.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editar los datos del atractivo. Aparece en la home del destino si lo
          marcás como imperdible.
        </p>
      </div>

      <LugarEstadoActions
        lugarId={lugar.id}
        estadoActual={lugar.estado}
        tipo="atractivo"
        listadoPath="/admin/atractivos"
      />

      <LugarFotosManager
        lugarId={lugar.id}
        fotos={lugar.lugar_fotos}
        tipo="atractivo"
      />

      <LugarForm
        tipo="atractivo"
        destinos={destinos}
        initial={lugar}
        submitLabel="Guardar cambios"
        action={action}
      />
    </div>
  );
}
