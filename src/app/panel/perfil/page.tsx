import { requireResponsable } from "@/features/panel/lib/auth";
import { ChangePasswordForm } from "@/features/panel/components/ChangePasswordForm";

export default async function PanelPerfilPage() {
  const user = await requireResponsable();

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Datos de tu cuenta de responsable.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">Datos de acceso</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Nombre</dt>
            <dd className="font-medium">
              {user.perfil.nombre ?? "(sin nombre)"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="w-32 shrink-0 text-muted-foreground">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          Si necesitás cambiar el email contactá al admin del destino.
        </p>
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
