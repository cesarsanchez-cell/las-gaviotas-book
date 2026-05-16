import type { Metadata } from "next";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { getCurrentAdmin } from "@/features/admin/lib/auth";

export const metadata: Metadata = {
  title: "Admin · Mis Escapadas",
  robots: { index: false, follow: false },
};

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

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
          />
        </div>
      </div>
      <main className="flex-1 bg-muted/20">
        <div className="md:hidden">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
          />
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
