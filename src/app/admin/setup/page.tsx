"use client";

import type { Metadata } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { AdminSetupForm } from "@/features/admin/components/AdminSetupForm";
import { createClient } from "@/lib/supabase/client";
import { siteConfig } from "@/config/site";

export default function AdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      const supabase = await createClient();

      // Escuchar cambios de sesión (PKCE se procesa asincronamente)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const { data } = await supabase.auth.getUser();

            // Solo admins pueden estar en esta ruta
            if (data.user?.user_metadata?.role !== "admin") {
              router.push("/login");
              return;
            }

            setEmail(data.user?.email ?? null);
            setLoading(false);
            return;
          }

          // Si no hay sesión después de esperar un poco, mostrar error
          if (event !== "SIGNED_IN") {
            setTimeout(() => {
              const { data } = supabase.auth.getUser();
              if (!data.user) {
                setError("Sesión expirada. Solicita un nuevo link.");
                setLoading(false);
              }
            }, 1000);
          }
        }
      );

      return () => subscription?.unsubscribe();
    }

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Cargando...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <Container size="sm">
          <div className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-8">
            <p className="text-sm text-rose-800">{error}</p>
            <Link href="/forgot-password" className="mt-4 block text-sm text-rose-800 underline">
              Solicitar nuevo link
            </Link>
          </div>
        </Container>
      </main>
    );
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
              Hola <span className="font-medium text-foreground">{email}</span>.
              Define una contraseña para tu cuenta de administrador.
            </p>
            <AdminSetupForm />
          </div>
        </div>
      </Container>
    </main>
  );
}
