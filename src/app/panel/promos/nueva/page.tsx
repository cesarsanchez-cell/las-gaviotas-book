import { redirect } from "next/navigation";
import { requireResponsable } from "@/features/panel/lib/auth";
import { listComerciosParaPromo } from "@/features/promos/lib/queries";
import { createPromoAsResponsableAction } from "@/features/promos/lib/actions";
import { PromoForm } from "@/features/promos/components/PromoForm";

export default async function NuevaPromoResponsablePage() {
  const resp = await requireResponsable();
  const comercios = await listComerciosParaPromo({
    modo: "responsable",
    hospedajeIds: resp.hospedajeIds,
    lugarIds: resp.lugarIds,
  });

  async function action(fd: FormData) {
    "use server";
    const r = await createPromoAsResponsableAction(fd);
    if (r?.ok && r?.id) redirect(`/panel/promos/${r.id}`);
    return r;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Nueva promo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elegí uno de tus comercios y describí el beneficio. La foto se hereda
          del comercio.
        </p>
      </header>

      <PromoForm comercios={comercios} submitLabel="Crear promo" action={action} />
    </div>
  );
}
