"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import { sendEmail } from "@/lib/email/resend";
import {
  hospedajeAprobadoTemplate,
  hospedajeRechazadoTemplate,
} from "@/lib/email/templates";
import { siteConfig } from "@/config/site";

async function setLatestEventNote(hospedajeId: string, notas: string) {
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("validacion_eventos")
    .select("id")
    .eq("hospedaje_id", hospedajeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: number }>();
  if (latest) {
    await admin
      .from("validacion_eventos")
      .update({ notas } as never)
      .eq("id", latest.id);
  }
}

/**
 * Devuelve { responsable, hospedaje, destino } o null si no encuentra todo.
 * Usa service role para bypasear RLS — solo se llama desde acciones de admin.
 */
async function gatherNotificationContext(hospedajeId: string) {
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

  // Buscar el perfil responsable que tiene este hospedaje en su array.
  const { data: perfil } = await admin
    .from("perfiles")
    .select("id, nombre")
    .contains("hospedajes_ids", [hospedajeId])
    .eq("rol", "responsable")
    .maybeSingle<{ id: string; nombre: string | null }>();
  if (!perfil) return null;

  // Email del responsable vía auth.admin (service role).
  const { data: userInfo } = await admin.auth.admin.getUserById(perfil.id);
  const email = userInfo?.user?.email ?? null;
  if (!email) return null;

  return {
    responsable: { email, nombre: perfil.nombre },
    hospedaje: { slug: h.slug, nombre: h.nombre },
    destino: { slug: d.slug, nombre: d.nombre },
  };
}

export async function approveHospedajeAction(
  id: string,
  notas?: string
): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "publicado" } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (notas && notas.trim()) await setLatestEventNote(id, notas.trim());

  // Notificar al responsable. No-bloqueante: si falla, la aprobación queda OK
  // igualmente y se logueá el error en consola del server.
  void (async () => {
    const ctx = await gatherNotificationContext(id);
    if (!ctx) return;
    const tpl = hospedajeAprobadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      hospedajeNombre: ctx.hospedaje.nombre,
      destinoNombre: ctx.destino.nombre,
      urlPublica: `${siteConfig.url}/${ctx.destino.slug}/hospedajes/${ctx.hospedaje.slug}`,
      urlPanel: `${siteConfig.url}/panel/hospedajes/${id}`,
    });
    await sendEmail({ to: ctx.responsable.email, ...tpl });
  })();

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/validaciones");
  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${id}`);
  return { ok: true };
}

export async function rejectHospedajeAction(
  id: string,
  notas: string
): Promise<ActionResult> {
  await requireAdmin();
  if (!notas?.trim()) {
    return { error: "Tenés que escribir el motivo del rechazo." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "rechazado" } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  const motivo = notas.trim();
  await setLatestEventNote(id, motivo);

  // Notificar rechazo. No-bloqueante.
  void (async () => {
    const ctx = await gatherNotificationContext(id);
    if (!ctx) return;
    const tpl = hospedajeRechazadoTemplate({
      responsableNombre: ctx.responsable.nombre,
      hospedajeNombre: ctx.hospedaje.nombre,
      destinoNombre: ctx.destino.nombre,
      motivo,
      urlPanel: `${siteConfig.url}/panel/hospedajes/${id}`,
    });
    await sendEmail({ to: ctx.responsable.email, ...tpl });
  })();

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/validaciones");
  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${id}`);
  revalidatePath(`/panel/hospedajes/${id}`);
  return { ok: true };
}
