import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Callback de Supabase Auth: el link del email de confirmación / recovery
// pega acá con ?code=xxx&next=/panel. Cambiamos el code por una sesión
// (cookies seteadas para nuestro dominio) y redirigimos a `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/panel";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // `next` siempre debe ser un path relativo, NO una URL externa.
  const safeNext = next.startsWith("/") ? next : "/panel";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
