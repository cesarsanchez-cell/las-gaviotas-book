import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  getPromoById,
  listComerciosParaPromo,
} from "@/features/promos/lib/queries";
import {
  updatePromoAsAdminAction,
  deletePromoAsAdminAction,
} from "@/features/promos/lib/actions";
import { PromoForm } from "@/features/promos/components/PromoForm";
import { Button } from "@/components/ui/button";

export default async function EditPromoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const promo = await getPromoById(id);
  if (!promo) notFound();
  if (!admin.isSuperAdmin && promo.destino_id !== admin.destinoId) notFound();

  const comercios = await listComerciosParaPromo({
    modo: "admin",
    destinoId: admin.destinoId,
  });

  async function action(fd: FormData) {
    "use server";
    return updatePromoAsAdminAction(id, fd);
  }

  async function del() {
    "use server";
    await deletePromoAsAdminAction(id);
    redirect("/admin/promos");
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
