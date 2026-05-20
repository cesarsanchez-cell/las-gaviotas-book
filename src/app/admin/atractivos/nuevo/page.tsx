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
          Nuevo atractivo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá lugares de interés del destino: playas, bosques, miradores,
          espacios culturales. Los gestionás vos directo, sin responsable.
        </p>
      </header>

      <LugarForm
        tipo="atractivo"
        destinos={destinos}
        submitLabel="Crear atractivo"
        action={action}
      />
    </div>
  );
}
