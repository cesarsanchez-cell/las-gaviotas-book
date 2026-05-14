import type { Metadata } from "next";
import { PanelSidebar } from "@/features/panel/components/PanelSidebar";
import { requireResponsable } from "@/features/panel/lib/auth";

export const metadata: Metadata = {
  title: "Panel · Las Gaviotas BOOK",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireResponsable();

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <PanelSidebar email={user.email} nombre={user.perfil.nombre} />
        </div>
      </div>
      <main className="flex-1 bg-muted/20">
        <div className="md:hidden">
          <PanelSidebar email={user.email} nombre={user.perfil.nombre} />
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}
