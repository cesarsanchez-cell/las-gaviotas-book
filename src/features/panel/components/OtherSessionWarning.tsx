import { createClient } from "@/lib/supabase/server";
import { signOutPanelAction } from "@/features/panel/lib/session-actions";

/**
 * Aviso visible cuando ya hay una sesión activa (responsable o admin) al
 * entrar a /login o /registro. Permite cerrarla antes de seguir.
 */
export async function OtherSessionWarning() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle<{ rol: string }>();

  const esAdmin = perfil?.rol === "admin";

  return (
    <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Hay otra sesión activa</p>
      <p className="mt-1 text-xs">
        Estás logueado como {user.email}
        {esAdmin ? " (administrador)" : ""}. Cerrá esta sesión antes de
        ingresar con otra cuenta.
      </p>
      <form action={signOutPanelAction} className="mt-2">
        <button
          type="submit"
          className="text-xs font-medium text-amber-900 underline hover:no-underline"
        >
          Cerrar sesión actual →
        </button>
      </form>
    </div>
  );
}
