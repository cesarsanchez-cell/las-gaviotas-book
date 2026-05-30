import { redirect } from "next/navigation";
import { requireResponsable } from "@/features/panel/lib/auth";
import { listComerciosParaCombo } from "@/features/combos/lib/queries";
import { createComboAsResponsableAction } from "@/features/combos/lib/actions";
import { ComboForm } from "@/features/combos/components/ComboForm";

export default async function NuevoComboResponsablePage() {
  const resp = await requireResponsable();
  const comercios = await listComerciosParaCombo({
    modo: "responsable",
    perfilId: resp.id,
  });

  async function action(fd: FormData) {
    "use server";
    const r = await createComboAsResponsableAction(fd);
    if (r?.ok && r?.id) redirect(`/panel/combos/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Nuevo combo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cruzá 2-3 comercios publicados de tu destino. Queda pendiente hasta que
          el admin lo apruebe.
        </p>
      </header>

      <ComboForm comercios={comercios} submitLabel="Enviar a revisión" action={action} />
    </div>
  );
}
