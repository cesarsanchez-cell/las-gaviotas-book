import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { siteConfig } from "@/config/site";

interface ComboNotifContext {
  creador: { email: string; nombre: string | null } | null;
  combo: { id: string; titulo: string };
  destino: { slug: string; nombre: string };
}

async function gatherComboCtx(comboId: string): Promise<ComboNotifContext | null> {
  const sb = createAdminClient();
  const { data: c } = await sb
    .from("combos")
    .select("id, titulo, destino_id, creado_por")
    .eq("id", comboId)
    .maybeSingle<{
      id: string;
      titulo: string;
      destino_id: string;
      creado_por: string | null;
    }>();
  if (!c) return null;

  const { data: d } = await sb
    .from("destinos")
    .select("slug, nombre")
    .eq("id", c.destino_id)
    .maybeSingle<{ slug: string; nombre: string }>();
  if (!d) return null;

  let creador: ComboNotifContext["creador"] = null;
  if (c.creado_por) {
    const { data: perfil } = await sb
      .from("perfiles")
      .select("nombre")
      .eq("id", c.creado_por)
      .maybeSingle<{ nombre: string | null }>();
    const { data: userInfo } = await sb.auth.admin.getUserById(c.creado_por);
    const email = userInfo?.user?.email ?? null;
    if (email) creador = { email, nombre: perfil?.nombre ?? null };
  }

  return {
    creador,
    combo: { id: c.id, titulo: c.titulo },
    destino: { slug: d.slug, nombre: d.nombre },
  };
}

function shell(titulo: string, cuerpo: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#00233C">
    <h2 style="font-family:Georgia,serif;color:#28566B">${titulo}</h2>${cuerpo}
    <p style="font-size:12px;color:#888;margin-top:24px">${siteConfig.name} — Red de portales turísticos locales</p>
  </div>`;
}

/** Notifica al creador (responsable o admin) que su combo fue publicado. */
export async function notifyComboPublicado(comboId: string): Promise<void> {
  try {
    const ctx = await gatherComboCtx(comboId);
    if (!ctx) {
      console.warn("[notifyComboPublicado] sin contexto:", comboId);
      return;
    }
    if (!ctx.creador) {
      console.warn("[notifyComboPublicado] combo sin creador con email:", comboId);
      return;
    }
    const tpl = {
      subject: `Tu combo "${ctx.combo.titulo}" fue publicado`,
      html: shell(
        "¡Tu combo está publicado!",
        `<p>Hola ${ctx.creador.nombre ?? ""}, tu combo <strong>${ctx.combo.titulo}</strong> en ${ctx.destino.nombre} ya está visible al público.</p>
         <p><a href="${siteConfig.url}/${ctx.destino.slug}" style="color:#28566B">Ver en ${ctx.destino.nombre} →</a></p>
         <p><a href="${siteConfig.url}/panel/combos/${ctx.combo.id}" style="color:#28566B">Gestionar el combo →</a></p>`
      ),
    };
    const result = await sendEmail({ to: ctx.creador.email, ...tpl });
    if (!result.ok) console.error("[notifyComboPublicado] sendEmail falló:", result.error);
  } catch (e) {
    console.error("[notifyComboPublicado] error:", e);
  }
}

/** Notifica al creador que su combo fue rechazado, con motivo. */
export async function notifyComboRechazado(
  comboId: string,
  motivo: string
): Promise<void> {
  try {
    const ctx = await gatherComboCtx(comboId);
    if (!ctx) {
      console.warn("[notifyComboRechazado] sin contexto:", comboId);
      return;
    }
    if (!ctx.creador) {
      console.warn("[notifyComboRechazado] combo sin creador con email:", comboId);
      return;
    }
    const tpl = {
      subject: `Tu combo "${ctx.combo.titulo}" necesita cambios`,
      html: shell(
        "Tu combo necesita ajustes",
        `<p>Hola ${ctx.creador.nombre ?? ""}, tu combo <strong>${ctx.combo.titulo}</strong> en ${ctx.destino.nombre} no fue publicado todavía.</p>
         <p><strong>Motivo:</strong> ${motivo}</p>
         <p><a href="${siteConfig.url}/panel/combos/${ctx.combo.id}" style="color:#28566B">Editar el combo →</a></p>`
      ),
    };
    const result = await sendEmail({ to: ctx.creador.email, ...tpl });
    if (!result.ok) console.error("[notifyComboRechazado] sendEmail falló:", result.error);
  } catch (e) {
    console.error("[notifyComboRechazado] error:", e);
  }
}
