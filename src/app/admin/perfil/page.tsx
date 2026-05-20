import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChangePasswordForm } from "@/features/panel/components/ChangePasswordForm";

async function getDestinoNombre(destinoId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("destinos")
    .select("nombre")
    .eq("id", destinoId)
    .maybeSingle<{ nombre: string }>();
  return data?.nombre ?? null;
}

export default async function AdminPerfilPage() {
  const me = await requireAdmin();
  const destinoNombre = me.destinoId
    ? await getDestinoNombre(me.destinoId)
    : null;

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de tu cuenta de administrador.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">Datos de acceso</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Nombre</dt>
            <dd className="font-medium">
              {me.perfil.nombre ?? "(sin nombre)"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Email</dt>
            <dd className="font-medium">{me.email}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Scope</dt>
            <dd className="font-medium">
              {me.isSuperAdmin
                ? "Super admin (toda la red)"
                : destinoNombre
                  ? `Admin local · ${destinoNombre}`
                  : "Admin"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">
          Cambiar contraseña
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Te pedimos la actual como medida de seguridad. Si la olvidaste, cerrá
          sesión y usá &laquo;¿Olvidaste tu contraseña?&raquo; en el login.
        </p>
        <div className="mt-5">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
