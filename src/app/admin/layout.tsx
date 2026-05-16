import type { Metadata } from "next";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin · Mis Escapadas",
  robots: { index: false, follow: false },
};

async function getDestinoNombre(destinoId: string | null): Promise<string | null> {
  if (!destinoId) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("destinos")
    .select("nombre")
    .eq("id", destinoId)
    .maybeSingle<{ nombre: string }>();
  return data?.nombre ?? null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  // El login page tiene su propio layout (no envuelve aquí porque admin = null).
  if (!admin) {
    return <>{children}</>;
  }

  const destinoNombre = await getDestinoNombre(admin.destinoId);

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
            isSuperAdmin={admin.isSuperAdmin}
            destinoNombre={destinoNombre}
          />
        </div>
      </div>
      <main className="flex-1 bg-muted/20">
        <div className="md:hidden">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
            isSuperAdmin={admin.isSuperAdmin}
            destinoNombre={destinoNombre}
          />
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
