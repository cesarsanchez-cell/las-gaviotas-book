import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { LoginForm } from "@/features/admin/components/LoginForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Acceso administradores",
  description: "Panel de administración de Las Gaviotas BOOK.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams;

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
            Acceso solo para administradores
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <LoginForm next={next} />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            ¿No tenés cuenta? Contactá al administrador del sitio.
          </p>
        </div>
      </Container>
    </main>
  );
}
