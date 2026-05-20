import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ForgotPasswordForm } from "@/features/panel/components/ForgotPasswordForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Recuperá el acceso a tu cuenta de Mis Escapadas.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
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
            Recuperar contraseña
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              ← Volver al login
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
