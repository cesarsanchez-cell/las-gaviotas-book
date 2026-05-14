import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { SignupForm } from "@/features/panel/components/SignupForm";
import { OtherSessionWarning } from "@/features/panel/components/OtherSessionWarning";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Sumá tu hospedaje",
  description:
    "Registrate como responsable y publicá tu alojamiento en Las Gaviotas BOOK.",
  robots: { index: true, follow: true },
};

export default function RegistroPage() {
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
            Sumá tu alojamiento al directorio
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <h1 className="mb-1 font-display text-2xl tracking-tight">
              Crear cuenta
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Como responsable, vas a poder cargar tu hospedaje, sus fotos y
              datos. Una vez completo, lo enviás a revisión al equipo.
            </p>
            <OtherSessionWarning />
            <SignupForm />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Ingresá
            </Link>
          </p>
        </div>
      </Container>
    </main>
  );
}
