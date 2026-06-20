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

async function getResponsabilidadesCounts(
  userId: string
): Promise<{ hospedajes: number; gastronomicos: number }> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("responsabilidades")
    .select("entidad_tipo")
    .eq("perfil_id", userId)
    .returns<Array<{ entidad_tipo: "hospedaje" | "lugar" }>>();
  let hospedajes = 0;
  let gastronomicos = 0;
  for (const r of data ?? []) {
    if (r.entidad_tipo === "hospedaje") hospedajes++;
    else if (r.entidad_tipo === "lugar") gastronomicos++;
  }
  return { hospedajes, gastronomicos };
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

  const [destinoNombre, respCounts] = await Promise.all([
    getDestinoNombre(admin.destinoId),
    getResponsabilidadesCounts(admin.id),
  ]);
  const alsoIsResponsable =
    respCounts.hospedajes + respCounts.gastronomicos > 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden w-64 shrink-0 md:block">
        <div className="h-full">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
            isSuperAdmin={admin.isSuperAdmin}
            destinoNombre={destinoNombre}
            alsoIsResponsable={alsoIsResponsable}
            respHospedajes={respCounts.hospedajes}
            respGastronomicos={respCounts.gastronomicos}
          />
        </div>
      </div>
      <main className="flex-1 overflow-y-auto bg-muted/20">
        <div className="md:hidden">
          <AdminSidebar
            email={admin.email}
            nombre={admin.perfil.nombre}
            isSuperAdmin={admin.isSuperAdmin}
            destinoNombre={destinoNombre}
            alsoIsResponsable={alsoIsResponsable}
            respHospedajes={respCounts.hospedajes}
            respGastronomicos={respCounts.gastronomicos}
          />
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
