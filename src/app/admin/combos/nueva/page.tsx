import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listComerciosParaCombo } from "@/features/combos/lib/queries";
import { createComboAsAdminAction } from "@/features/combos/lib/actions";
import { ComboForm } from "@/features/combos/components/ComboForm";

export default async function NuevoComboAdminPage() {
  const admin = await requireAdmin();
  const comercios = await listComerciosParaCombo({
    modo: "admin",
    destinoId: admin.destinoId,
  });

  async function action(fd: FormData) {
    "use server";
    const r = await createComboAsAdminAction(fd);
    if (r?.ok && r?.id) redirect(`/admin/combos/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Nuevo combo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo creás en borrador. Después publicalo desde la ficha del combo.
        </p>
      </header>

      <ComboForm comercios={comercios} submitLabel="Crear combo" action={action} />
    </div>
  );
}
