import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import {
  getComboById,
  listComerciosParaCombo,
} from "@/features/combos/lib/queries";
import {
  updateComboAsAdminAction,
  deleteComboAsAdminAction,
  changeEstadoComboAction,
} from "@/features/combos/lib/actions";
import { ComboForm } from "@/features/combos/components/ComboForm";
import {
  ESTADO_COMBO_LABEL,
  ESTADO_COMBO_CLASS,
} from "@/features/combos/components/ComboTable";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

export default async function EditComboAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const combo = await getComboById(id);
  if (!combo) notFound();
  if (!admin.isSuperAdmin && combo.combo.destino_id !== admin.destinoId) notFound();

  const comercios = await listComerciosParaCombo({
    modo: "admin",
    destinoId: admin.destinoId,
  });

  const estado = combo.combo.estado;

  async function action(fd: FormData) {
    "use server";
    return updateComboAsAdminAction(id, fd);
  }
  async function publicar() {
    "use server";
    await changeEstadoComboAction({ id, estado: "publicado" });
  }
  async function pausar() {
    "use server";
    await changeEstadoComboAction({ id, estado: "pausado" });
  }
  async function rechazar(fd: FormData) {
    "use server";
    await changeEstadoComboAction({
      id,
      estado: "rechazado",
      motivo: String(fd.get("motivo") ?? ""),
    });
  }
  async function del() {
    "use server";
    await deleteComboAsAdminAction(id);
    redirect("/admin/combos");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-tight">Editar combo</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {combo.combo.titulo}
            <Badge className={ESTADO_COMBO_CLASS[estado]}>
              {ESTADO_COMBO_LABEL[estado]}
            </Badge>
          </p>
        </div>
        <form action={del}>
          <Button type="submit" variant="outline" size="sm">
            Eliminar
          </Button>
        </form>
      </header>

      {/* Acciones de estado */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Estado</p>
        <div className="flex flex-wrap items-center gap-2">
          {estado !== "publicado" && (
            <form action={publicar}>
              <button
                type="submit"
                className={buttonVariants({ size: "sm" })}
              >
                Publicar
              </button>
            </form>
          )}
          {estado === "publicado" && (
            <form action={pausar}>
              <button
                type="submit"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Pausar
              </button>
            </form>
          )}
        </div>
        {estado !== "rechazado" && (
          <form action={rechazar} className="flex flex-col gap-2 sm:flex-row">
            <input
              name="motivo"
              placeholder="Motivo del rechazo (se le envía al responsable)"
              className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Rechazar
            </button>
          </form>
        )}
      </section>

      <ComboForm
        comercios={comercios}
        initial={combo}
        submitLabel="Guardar cambios"
        action={action}
      />
    </div>
  );
}
