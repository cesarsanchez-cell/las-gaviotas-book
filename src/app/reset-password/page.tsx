import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { ResetPasswordForm } from "@/features/panel/components/ResetPasswordForm";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Definir contraseña",
  description: "Definí una contraseña nueva para tu cuenta.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  // El link de recovery deja la sesión seteada vía /auth/callback. Si llegó acá
  // sin sesión, el link expiró o nunca lo abrió. Lo mandamos a pedir uno nuevo.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/forgot-password?error=expired");
  }

  // Decidir destino post-reset según el rol del usuario.
  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("perfiles")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle<{ rol: string }>();

  const next = perfil?.rol === "admin" ? "/admin" : "/panel";

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
            Definí tu nueva contraseña
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-8 shadow-sm">
            <p className="mb-5 text-sm text-muted-foreground">
              Hola <span className="font-medium text-foreground">{data.user.email}</span>.
              Elegí una contraseña nueva para tu cuenta.
            </p>
            <ResetPasswordForm next={next} />
          </div>
        </div>
      </Container>
    </main>
  );
}
