import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { hospedajeAprobadoTemplate } from "@/lib/email/templates";
import { siteConfig } from "@/config/site";

/**
 * Diagnóstico de aprobación.
 *
 * GET /api/debug-approval?hid=<uuid>            → inspecciona estado
 * GET /api/debug-approval?hid=<uuid>&send=1     → SIMULA el flujo de
 *   aprobación: ejecuta gatherNotificationContext + sendEmail y devuelve
 *   el resultado paso por paso (sin tocar el estado del hospedaje).
 */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sin sesión admin" }, { status: 401 });
  }

  const url = new URL(request.url);
  const hid = url.searchParams.get("hid");
  const shouldSend = url.searchParams.get("send") === "1";
  if (!hid) {
    return NextResponse.json(
      { error: "Pasá ?hid=<uuid>" },
      { status: 400 }
    );
  }

  const sbAdmin = createAdminClient();
  const log: Array<{ step: string; ok: boolean; data?: unknown }> = [];

  // 1) Hospedaje
  const { data: h, error: he } = await sbAdmin
    .from("hospedajes")
    .select("id, slug, nombre, destino_id, estado")
    .eq("id", hid)
    .maybeSingle<{
      id: string;
      slug: string;
      nombre: string;
      destino_id: string;
      estado: string;
    }>();
  log.push({ step: "1-hospedaje", ok: !!h, data: h ?? he?.message });
  if (!h) return NextResponse.json({ log });

  // 2) Destino
  const { data: d } = await sbAdmin
    .from("destinos")
    .select("slug, nombre")
    .eq("id", h.destino_id)
    .maybeSingle<{ slug: string; nombre: string }>();
  log.push({ step: "2-destino", ok: !!d, data: d });
  if (!d) return NextResponse.json({ log });

  // 3) Responsable
  const { data: perfil } = await sbAdmin
    .from("perfiles")
    .select("id, nombre")
    .contains("hospedajes_ids", [hid])
    .eq("rol", "responsable")
    .maybeSingle<{ id: string; nombre: string | null }>();
  log.push({ step: "3-responsable", ok: !!perfil, data: perfil });
  if (!perfil) return NextResponse.json({ log });

  // 4) Email del responsable
  const { data: userInfo, error: ue } =
    await sbAdmin.auth.admin.getUserById(perfil.id);
  const email = userInfo?.user?.email ?? null;
  log.push({
    step: "4-email",
    ok: !!email,
    data: email ?? ue?.message,
  });
  if (!email) return NextResponse.json({ log });

  // 5) Si pidieron send=1, intentamos mandar el mail
  if (shouldSend) {
    const tpl = hospedajeAprobadoTemplate({
      responsableNombre: perfil.nombre,
      hospedajeNombre: h.nombre,
      destinoNombre: d.nombre,
      urlPublica: `${siteConfig.url}/${d.slug}/hospedajes/${h.slug}`,
      urlPanel: `${siteConfig.url}/panel/hospedajes/${h.id}`,
    });
    try {
      const result = await sendEmail({ to: email, ...tpl });
      log.push({ step: "5-sendEmail", ok: result.ok, data: result });
    } catch (e) {
      log.push({
        step: "5-sendEmail",
        ok: false,
        data: e instanceof Error ? `EXCEPTION: ${e.message}` : "unknown",
      });
    }
  } else {
    log.push({
      step: "5-sendEmail",
      ok: true,
      data: "skipped — pasar &send=1 para enviar real",
    });
  }

  return NextResponse.json({ siteUrl: siteConfig.url, log });
}
