import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listDestinosParaSelect } from "@/features/admin/lib/lugar-queries";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { createLugarAsAdminAction } from "@/features/lugares/lib/actions";

export default async function NuevoAtractivoPage() {
  const admin = await requireAdmin();
  const destinos = await listDestinosParaSelect(admin.destinoId);

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", "atractivo");
    const r = await createLugarAsAdminAction(fd);
    if (r?.ok && r?.id) redirect(`/admin/atractivos/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Nueva actividad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá actividades y experiencias del destino: cabalgatas, excursiones,
          paseos, alquileres. Podés gestionarla vos o asignar un responsable.
          (Las playas, bosques y espacios culturales van en Atracciones.)
        </p>
      </header>

      <LugarForm
        tipo="atractivo"
        destinos={destinos}
        submitLabel="Crear actividad"
        action={action}
      />
    </div>
  );
}
