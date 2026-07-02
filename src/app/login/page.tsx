import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { LoginFormResponsable } from "@/features/panel/components/LoginFormResponsable";
import { OtherSessionWarning } from "@/features/panel/components/OtherSessionWarning";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Acceso para responsables de hospedajes.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ next?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, reset } = await searchParams;

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
            Panel de responsables
          </p>

          {reset === "ok" && (
            <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Tu contraseña fue actualizada. Ingresá con la nueva.
            </div>
          )}

          <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <OtherSessionWarning />
            <LoginFormResponsable next={next} />
            <p className="mt-4 text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?{" "}
            <Link
              href="/registro"
              className="font-medium text-primary hover:underline"
            >
              Sumá tu hospedaje
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
