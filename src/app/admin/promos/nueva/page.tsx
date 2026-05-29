import { redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listComerciosParaPromo } from "@/features/promos/lib/queries";
import { createPromoAsAdminAction } from "@/features/promos/lib/actions";
import { PromoForm } from "@/features/promos/components/PromoForm";

export default async function NuevaPromoPage() {
  const admin = await requireAdmin();
  const comercios = await listComerciosParaPromo({
    modo: "admin",
    destinoId: admin.destinoId,
  });

  async function action(fd: FormData) {
    "use server";
    const r = await createPromoAsAdminAction(fd);
    if (r?.ok && r?.id) redirect(`/admin/promos/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Nueva promo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí el comercio y describí el beneficio. La foto se hereda del
          comercio.
        </p>
      </header>

      <PromoForm comercios={comercios} submitLabel="Crear promo" action={action} />
    </div>
  );
}
