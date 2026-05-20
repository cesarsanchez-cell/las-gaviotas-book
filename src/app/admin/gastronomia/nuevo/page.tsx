import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listDestinosParaSelect } from "@/features/admin/lib/lugar-queries";
import { LugarForm } from "@/features/admin/components/LugarForm";
import { createLugarAsAdminAction } from "@/features/lugares/lib/actions";

export default async function NuevoGastronomicoPage() {
  const admin = await requireAdmin();
  const destinos = await listDestinosParaSelect(admin.destinoId);

  async function action(fd: FormData) {
    "use server";
    fd.set("tipo", "gastronomico");
    const r = await createLugarAsAdminAction(fd);
    if (r?.ok && r?.id) redirect(`/admin/gastronomia/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">
          Nuevo gastronómico
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo cargás como admin y queda en borrador. Después podés asignar un
          responsable que tome el control desde su panel.
        </p>
      </header>

      <LugarForm
        tipo="gastronomico"
        destinos={destinos}
        submitLabel="Crear gastronómico"
        action={action}
      />
    </div>
  );
}
