import { createClient } from "@/lib/supabase/server";

export type HeaderRol = "admin" | "responsable" | null;

export interface HeaderSession {
  authed: boolean;
  rol: HeaderRol;
  /** Destino del header de usuario logueado: admin → /admin, responsable → /panel. */
  homeHref: string;
}

const LOGGED_OUT: HeaderSession = {
  authed: false,
  rol: null,
  homeHref: "/login",
};

/**
 * Sesión mínima para el header público (UserMenu). El proyecto NO tiene login
 * de huéspedes en Etapa 1 — el menú es la puerta de entrada de responsables y
 * administradores. Mismo patrón de lectura que `getCurrentAdmin`
 * (src/features/admin/lib/auth.ts) pero sin restringir el rol.
 */
export async function getHeaderSession(): Promise<HeaderSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return LOGGED_OUT;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle<{ rol: string }>();

  if (perfil?.rol === "admin") {
    return { authed: true, rol: "admin", homeHref: "/admin" };
  }
  if (perfil?.rol === "responsable") {
    return { authed: true, rol: "responsable", homeHref: "/panel" };
  }
  // Usuario autenticado sin perfil claro: lo tratamos como deslogueado para
  // el menú (no exponemos destinos privados).
  return LOGGED_OUT;
}
