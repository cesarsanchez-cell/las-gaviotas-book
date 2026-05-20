import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/features/admin/lib/auth";
import { getLugarById } from "@/features/lugares/lib/queries";
import {
  listDestinosParaSelect,
  listResponsablesParaSelector,
  listResponsablesDeLugar,
} from "@/features/admin/lib/lugar-queries";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { LugarEstadoActions } from "@/features/admin/components/LugarEstadoActions";
import { LugarFotosManager } from "@/features/admin/components/LugarFotosManager";
import { LugarResponsablePanel } from "@/features/admin/components/LugarResponsablePanel";
import { updateLugarAsAdminAction } from "@/features/lugares/lib/actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGastronomicoPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { id } = await params;

  const lugar = await getLugarById(id);
  if (!lugar || lugar.tipo !== "gastronomico") notFound();
  if (!admin.isSuperAdmin && lugar.destino_id !== admin.destinoId) notFound();

  const [destinos, candidatosResp, responsablesActuales] = await Promise.all([
    listDestinosParaSelect(admin.destinoId),
    listResponsablesParaSelector(),
    listResponsablesDeLugar(id),
  ]);

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", "gastronomico");
    return updateLugarAsAdminAction(id, fd);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/gastronomia"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Gastronomía
        </Link>
        <h1 className="mt-2 font-display text-3xl tracking-tight">
          {lugar.nombre}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editar datos del local. Si lo carga un responsable, las consultas le
          llegarán a él directo.
        </p>
      </div>

      <LugarEstadoActions
        lugarId={lugar.id}
        estadoActual={lugar.estado}
        tipo="gastronomico"
        listadoPath="/admin/gastronomia"
      />

      <LugarResponsablePanel
        lugarId={lugar.id}
        responsablesActuales={responsablesActuales}
        candidatos={candidatosResp}
      />

      <LugarFotosManager
        lugarId={lugar.id}
        fotos={lugar.lugar_fotos}
        tipo="gastronomico"
      />

      <LugarForm
        tipo="gastronomico"
        destinos={destinos}
        initial={lugar}
        submitLabel="Guardar cambios"
        action={action}
      />
    </div>
  );
}
