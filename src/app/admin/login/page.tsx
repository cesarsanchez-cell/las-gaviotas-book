import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { signOutAction } from "@/features/admin/lib/session-actions";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Acceso administradores",
  description: "Panel de administración de Mis Escapadas.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, reset } = await searchParams;

  // Si ya es admin, llevarlo al panel admin
  const admin = await getCurrentAdmin();
  if (admin) redirect(next ?? "/admin");

  // Si hay sesión pero NO es admin, ofrecer logout (evita loop con requireAdmin)
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const otherUserLoggedIn = !!user;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Container size="sm">
        <div className="mx-auto max-w-sm px-4 sm:max-w-md sm:px-0">
          <Link
            href="/"
            className="block text-center font-display text-xl tracking-tight text-foreground sm:text-2xl"
          >
            {siteConfig.name}
          </Link>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Acceso solo para administradores
          </p>

          {reset === "ok" && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Tu contraseña fue actualizada. Ingresá con la nueva.
            </div>
          )}

          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {otherUserLoggedIn && (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p className="font-medium">Hay otra sesión activa</p>
                <p className="mt-1 text-xs">
                  Estás logueado como {user?.email}. Si esa cuenta no es admin,
                  cerrá sesión primero.
                </p>
                <form action={signOutAction} className="mt-2">
                  <button
                    type="submit"
                    className="text-xs font-medium text-amber-900 underline hover:no-underline"
                  >
                    Cerrar sesión actual →
                  </button>
                </form>
              </div>
            )}
            <LoginForm next={next} />
            <p className="mt-4 text-center text-sm">
              <Link
                href="/forgot-password?for=admin"
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿No tenés cuenta? Contactá al administrador del sitio.
          </p>
        </div>
      </Container>
    </main>
  );
}
