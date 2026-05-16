import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  hospedajeAprobadoTemplate,
  hospedajeRechazadoTemplate,
} from "@/lib/email/templates";
import { siteConfig } from "@/config/site";

interface NotificationContext {
  responsable: { email: string; nombre: string | null };
  hospedaje: { id: string; slug: string; nombre: string };
  destino: { slug: string; nombre: string };
}

export async function gatherNotificationContext(
  hospedajeId: string
): Promise<NotificationContext | null> {
  const admin = createAdminClient();

  const { data: h } = await admin
    .from("hospedajes")
    .select("id, slug, nombre, destino_id")
    .eq("id", hospedajeId)
    .maybeSingle<{ id: string; slug: string; nombre: string; destino_id: string }>();
  if (!h) return null;

  const { data: d } = await admin
    .from("destinos")
    .select("slug, nombre")
    .eq("id", h.destino_id)
    .maybeSingle<{ slug: string; nombre: string }>();
  if (!d) return null;

  const { data: perfil } = await admin
    .from("perfiles")
    .select("id, nombre")
    .contains("hospedajes_ids", [hospedajeId])
    .eq("rol", "responsable")
    .maybeSingle<{ id: string; nombre: string | null }>();
  if (!perfil) return null;

  const { data: userInfo } = await admin.auth.admin.getUserById(perfil.id);
  const email = userInfo?.user?.email ?? null;
  if (!email) return null;

  return {
    responsable: { email, nombre: perfil.nombre },
    hospedaje: { id: h.id, slug: h.slug, nombre: h.nombre },
    destino: { slug: d.slug, nombre: d.nombre },
  };
}

export async function notifyHospedajePublicado(hospedajeId: string): Promise<void> {
  try {
    const ctx = await gatherNotificationContext(hospedajeId);
    if (!ctx) {
      console.warn(
        "[notifyPublicado] No se pudo armar contexto para hospedaje",
        hospedajeId
      );
      return;
    }
    const tpl = hospedajeAprobadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      hospedajeNombre: ctx.hospedaje.nombre,
      destinoNombre: ctx.destino.nombre,
      urlPublica: `${siteConfig.url}/${ctx.destino.slug}/hospedajes/${ctx.hospedaje.slug}`,
      urlPanel: `${siteConfig.url}/panel/hospedajes/${ctx.hospedaje.id}`,
    });
    const result = await sendEmail({ to: ctx.responsable.email, ...tpl });
    if (!result.ok) {
      console.error("[notifyPublicado] sendEmail falló:", result.error);
    }
  } catch (e) {
    console.error("[notifyPublicado] Error notificando aprobación:", e);
  }
}

export async function notifyHospedajeRechazado(
  hospedajeId: string,
  motivo: string
): Promise<void> {
  try {
    const ctx = await gatherNotificationContext(hospedajeId);
    if (!ctx) {
      console.warn(
        "[notifyRechazado] No se pudo armar contexto para hospedaje",
        hospedajeId
      );
      return;
    }
    const tpl = hospedajeRechazadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      hospedajeNombre: ctx.hospedaje.nombre,
      destinoNombre: ctx.destino.nombre,
      motivo,
      urlPanel: `${siteConfig.url}/panel/hospedajes/${ctx.hospedaje.id}`,
    });
    const result = await sendEmail({ to: ctx.responsable.email, ...tpl });
    if (!result.ok) {
      console.error("[notifyRechazado] sendEmail falló:", result.error);
    }
  } catch (e) {
    console.error("[notifyRechazado] Error notificando rechazo:", e);
  }
}
