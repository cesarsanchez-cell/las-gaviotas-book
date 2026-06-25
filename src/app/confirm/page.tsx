"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleConfirm() {
      try {
        const supabase = createClient();

        // Esperar a que Supabase procese el código de confirmación del hash/query
        // (ya debería estar procesado, pero confirmamos que la sesión existe)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && session.user.email_confirmed_at) {
          // Email confirmado, ir al panel
          router.replace("/panel");
        } else {
          // No confirmado aún o no hay sesión, ir a login
          router.replace("/login");
        }
      } catch (e) {
        console.error("Error en confirmación:", e);
        router.replace("/login");
      }
    }

    // Pequeño delay para que Supabase procese el token
    const timer = setTimeout(handleConfirm, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Confirmando tu email...</p>
    </div>
  );
}
