import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { AdminSignupForm } from "@/features/admin/components/AdminSignupForm";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Crear cuenta de administrador",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminRegistroPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const nombre = typeof params.nombre === "string" ? params.nombre : "";
  const destinoId = typeof params.destino_id === "string" ? params.destino_id : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 py-12">
      <Container size="sm">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="block text-center font-display text-2xl tracking-tight text-foreground"
          >
            {siteConfig.name}
          </Link>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Panel de administrador
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <h1 className="mb-1 font-display text-2xl tracking-tight">
              Crear cuenta
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Completá tu contraseña para acceder al panel de administración.
            </p>
            <AdminSignupForm initialEmail={email} initialNombre={nombre} destinoId={destinoId} />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/admin/login" className="font-medium text-primary hover:underline">
              Ingresá
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
