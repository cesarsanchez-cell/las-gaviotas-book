import { notFound, redirect } from "next/navigation";
import { requireResponsable } from "@/features/panel/lib/auth";
import {
  getPromoById,
  listComerciosParaPromo,
} from "@/features/promos/lib/queries";
import {
  updatePromoAsResponsableAction,
  deletePromoAsResponsableAction,
} from "@/features/promos/lib/actions";
import { PromoForm } from "@/features/promos/components/PromoForm";
import { Button } from "@/components/ui/button";

export default async function EditPromoResponsablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resp = await requireResponsable();
  const promo = await getPromoById(id);
  if (!promo) notFound();

  // Scope: la promo debe ser de un comercio del responsable.
  const owns =
    promo.comercio_tipo === "hospedaje"
      ? resp.hospedajeIds.includes(promo.comercio_id)
      : resp.lugarIds.includes(promo.comercio_id);
  if (!owns) notFound();

  const comercios = await listComerciosParaPromo({
    modo: "responsable",
    hospedajeIds: resp.hospedajeIds,
    lugarIds: resp.lugarIds,
  });

  async function action(fd: FormData) {
    "use server";
    return updatePromoAsResponsableAction(id, fd);
  }

  async function del() {
    "use server";
    await deletePromoAsResponsableAction(id);
    redirect("/panel/promos");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Editar promo</h1>
          <p className="mt-1 text-sm text-muted-foreground">{promo.titulo}</p>
        </div>
        <form action={del}>
          <Button type="submit" variant="outline" size="sm">
            Eliminar
          </Button>
        </form>
      </header>

      <PromoForm
        comercios={comercios}
        initial={promo}
        submitLabel="Guardar cambios"
        action={action}
      />
    </div>
  );
}
