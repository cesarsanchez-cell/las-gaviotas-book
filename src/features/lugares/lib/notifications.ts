import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  lugarPublicadoTemplate,
  lugarRechazadoTemplate,
} from "@/lib/email/templates";
import { siteConfig } from "@/config/site";

interface LugarNotifContext {
  responsable: { email: string; nombre: string | null } | null;
  lugar: { id: string; slug: string; nombre: string; tipo: string };
  destino: { slug: string; nombre: string };
}

/**
 * Arma el contexto para mandar notificaciones de un lugar.
 * Lee el responsable desde `responsabilidades` (no del campo legacy).
 * Devuelve `responsable: null` si el lugar no tiene responsable asignado —
 * el caller decide qué hacer (típicamente: silenciar para atractivos,
 * loguear para gastronómicos sin dueño).
 */
async function gatherLugarNotifContext(
  lugarId: string
): Promise<LugarNotifContext | null> {
  const sb = createAdminClient();

  const { data: l } = await sb
    .from("lugares")
    .select("id, slug, nombre, tipo, destino_id")
    .eq("id", lugarId)
    .maybeSingle<{
      id: string;
      slug: string;
      nombre: string;
      tipo: string;
      destino_id: string;
    }>();
  if (!l) return null;

  const { data: d } = await sb
    .from("destinos")
    .select("slug, nombre")
    .eq("id", l.destino_id)
    .maybeSingle<{ slug: string; nombre: string }>();
  if (!d) return null;

  const { data: resp } = await sb
    .from("responsabilidades")
    .select("perfil_id")
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", lugarId)
    .maybeSingle<{ perfil_id: string }>();

  let responsable: LugarNotifContext["responsable"] = null;
  if (resp?.perfil_id) {
    const { data: perfil } = await sb
      .from("perfiles")
      .select("nombre")
      .eq("id", resp.perfil_id)
      .maybeSingle<{ nombre: string | null }>();
    const { data: userInfo } = await sb.auth.admin.getUserById(resp.perfil_id);
    const email = userInfo?.user?.email ?? null;
    if (email) {
      responsable = { email, nombre: perfil?.nombre ?? null };
    }
  }

  return {
    responsable,
    lugar: { id: l.id, slug: l.slug, nombre: l.nombre, tipo: l.tipo },
    destino: { slug: d.slug, nombre: d.nombre },
  };
}

/**
 * Notifica al responsable que su comercio (gastronómico o "Qué hacer") fue
 * publicado. Silencioso (con log) si el lugar no tiene responsable asignado
 * (caso patológico — `createLugarAsResponsable` autoasigna; el admin puede
 * cargar uno sin responsable y asignarlo después).
 */
export async function notifyLugarPublicado(lugarId: string): Promise<void> {
  try {
    const ctx = await gatherLugarNotifContext(lugarId);
    if (!ctx) {
      console.warn("[notifyLugarPublicado] sin contexto:", lugarId);
      return;
    }
    // Gastronómico y "Qué hacer" (atractivo) son comerciales: si tienen
    // responsable asignado, le avisamos. Sin responsable, log (caso patológico).
    if (!ctx.responsable) {
      console.warn("[notifyLugarPublicado] comercio sin responsable:", lugarId);
      return;
    }
    const segmento =
      ctx.lugar.tipo === "gastronomico" ? "gastronomia" : "atractivos";
    const tpl = lugarPublicadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      lugarNombre: ctx.lugar.nombre,
      destinoNombre: ctx.destino.nombre,
      urlPublica: `${siteConfig.url}/${ctx.destino.slug}/${segmento}/${ctx.lugar.slug}`,
      urlPanel: `${siteConfig.url}/panel/lugares/${ctx.lugar.id}`,
    });
    const result = await sendEmail({ to: ctx.responsable.email, ...tpl });
    if (!result.ok) {
      console.error("[notifyLugarPublicado] sendEmail falló:", result.error);
    }
  } catch (e) {
    console.error("[notifyLugarPublicado] error:", e);
  }
}

export async function notifyLugarRechazado(
  lugarId: string,
  motivo: string
): Promise<void> {
  try {
    const ctx = await gatherLugarNotifContext(lugarId);
    if (!ctx) return;
    if (!ctx.responsable) return;
    const tpl = lugarRechazadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      lugarNombre: ctx.lugar.nombre,
      destinoNombre: ctx.destino.nombre,
      motivo,
      urlPanel: `${siteConfig.url}/panel/lugares/${ctx.lugar.id}`,
    });
    const result = await sendEmail({ to: ctx.responsable.email, ...tpl });
    if (!result.ok) {
      console.error("[notifyLugarRechazado] sendEmail falló:", result.error);
    }
  } catch (e) {
    console.error("[notifyLugarRechazado] error:", e);
  }
}
