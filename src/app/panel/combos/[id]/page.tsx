import { notFound, redirect } from "next/navigation";
import { requireResponsable } from "@/features/panel/lib/auth";
import {
  getComboById,
  listComerciosParaCombo,
} from "@/features/combos/lib/queries";
import {
  updateComboAsResponsableAction,
  deleteComboAsResponsableAction,
} from "@/features/combos/lib/actions";
import { ComboForm } from "@/features/combos/components/ComboForm";
import {
  ESTADO_COMBO_LABEL,
  ESTADO_COMBO_CLASS,
} from "@/features/combos/components/ComboTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function EditComboResponsablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resp = await requireResponsable();
  const combo = await getComboById(id);
  if (!combo) notFound();
  if (combo.combo.creado_por !== resp.id) notFound();

  const comercios = await listComerciosParaCombo({
    modo: "responsable",
    perfilId: resp.id,
  });

  async function action(fd: FormData) {
    "use server";
    return updateComboAsResponsableAction(id, fd);
  }

  async function del() {
    "use server";
    await deleteComboAsResponsableAction(id);
    redirect("/panel/combos");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Editar combo</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {combo.combo.titulo}
            <Badge className={ESTADO_COMBO_CLASS[combo.combo.estado]}>
              {ESTADO_COMBO_LABEL[combo.combo.estado]}
            </Badge>
          </p>
        </div>
        <form action={del}>
          <Button type="submit" variant="outline" size="sm">
            Eliminar
          </Button>
        </form>
      </header>

      <ComboForm
        comercios={comercios}
        initial={combo}
        submitLabel="Guardar y reenviar a revisión"
        action={action}
      />
    </div>
  );
}
