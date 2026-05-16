import { notFound } from "next/navigation";
import { requireAdmin } from "@/features/admin/lib/auth";
import { listAdminsAction } from "@/features/admin/lib/admin-management";
import { listDestinosForSelect } from "@/features/admin/lib/queries";
import { AdminsList } from "@/features/admin/components/AdminsList";
import { NewAdminLocalForm } from "@/features/admin/components/NewAdminLocalForm";

export default async function AdminsPage() {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) notFound();

  const [admins, destinos] = await Promise.all([
    listAdminsAction(),
    listDestinosForSelect(null),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <header>
        <h1 className="font-display text-3xl tracking-tight">Administradores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestión de super admins y admins locales por destino. Solo accesible
          para super admin.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-xl tracking-tight">Crear admin local</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le da acceso a validar y publicar hospedajes solo del destino que le
          asignes. Generamos una contraseña temporal — copiala y pasásela al
          admin por canal privado.
        </p>
        <div className="mt-5">
          <NewAdminLocalForm destinos={destinos} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-xl tracking-tight">Admins existentes</h2>
        <AdminsList admins={admins} currentUserId={me.id} />
      </section>
    </div>
  );
}
