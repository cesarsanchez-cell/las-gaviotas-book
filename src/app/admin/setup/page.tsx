import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { AdminSetupForm } from "@/features/admin/components/AdminSetupForm";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Configura tu cuenta de administrador",
  description: "Define una contraseña para tu cuenta de administrador.",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/forgot-password?error=expired");
  }

  // Solo admins pueden estar en esta ruta
  if (data.user.user_metadata?.role !== "admin") {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Container size="sm">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="block text-center font-display text-2xl tracking-tight text-foreground"
          >
            {siteConfig.name}
          </Link>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Panel de administrador
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <p className="mb-5 text-sm text-muted-foreground">
              Hola <span className="font-medium text-foreground">{data.user.email}</span>.
              Define una contraseña para tu cuenta de administrador.
            </p>
            <AdminSetupForm />
          </div>
        </div>
      </Container>
    </main>
  );
}
