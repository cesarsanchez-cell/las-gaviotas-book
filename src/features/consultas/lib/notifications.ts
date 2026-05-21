import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  consultaNuevaTemplate,
  consultaNuevaSinResponsableTemplate,
  type DisponibilidadFlag,
} from "@/lib/email/templates";
import { countDiasBloqueadosEnRango } from "@/features/disponibilidad/lib/queries";
import { siteConfig } from "@/config/site";

function formatDateISO(iso: string): string {
  // YYYY-MM-DD → DD/MM/YYYY (no usamos toLocaleDateString para evitar TZ surprises)
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function diffDays(checkInISO: string, checkOutISO: string): number {
  const a = new Date(checkInISO + "T00:00:00Z");
  const b = new Date(checkOutISO + "T00:00:00Z");
  return Math.max(
    1,
    Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  );
}

async function getDisponibilidadFlag(
  hospedajeId: string,
  checkIn: string,
  checkOut: string
): Promise<DisponibilidadFlag> {
  const bloqueados = await countDiasBloqueadosEnRango(
    hospedajeId,
    checkIn,
    checkOut
  );
  if (bloqueados === 0) return "disponible";
  const total = diffDays(checkIn, checkOut);
  if (bloqueados >= total) return "ocupado";
  return "parcial";
}

/**
 * Notifica al responsable que llegó una consulta nueva sobre su hospedaje.
 *
 * Hace todo el gather de contexto (hospedaje + destino + email del
 * responsable) y manda el mail vía Resend. Falla silencioso con log al
 * server console — no rompe el flujo del huésped si el mail falla.
 */
export async function notifyConsultaNueva(consultaId: string): Promise<void> {
  try {
    const sb = createAdminClient();

    const { data: consulta } = await sb
      .from("consultas")
      .select(
        "id, hospedaje_id, unidad_type_id, nombre, email, whatsapp, mensaje, check_in, check_out, cantidad_huespedes, adultos, ninos, bebes, canal_preferido"
      )
      .eq("id", consultaId)
      .maybeSingle<{
        id: string;
        hospedaje_id: string;
        unidad_type_id: string | null;
        nombre: string;
        email: string;
        whatsapp: string | null;
        mensaje: string;
        check_in: string;
        check_out: string;
        cantidad_huespedes: number;
        adultos: number | null;
        ninos: number | null;
        bebes: number | null;
        canal_preferido: "mail" | "whatsapp" | null;
      }>();
    if (!consulta) {
      console.warn("[notifyConsulta] No se encontró la consulta", consultaId);
      return;
    }

    const { data: h } = await sb
      .from("hospedajes")
      .select("id, nombre, destino_id")
      .eq("id", consulta.hospedaje_id)
      .maybeSingle<{ id: string; nombre: string; destino_id: string }>();
    if (!h) return;

    // Si la consulta es contextualizada por unidad, traemos el nombre.
    let unidadNombre: string | null = null;
    if (consulta.unidad_type_id) {
      const { data: tipo } = await sb
        .from("unidad_types")
        .select("nombre")
        .eq("id", consulta.unidad_type_id)
        .maybeSingle<{ nombre: string }>();
      unidadNombre = tipo?.nombre ?? null;
    }

    const { data: d } = await sb
      .from("destinos")
      .select("nombre")
      .eq("id", h.destino_id)
      .maybeSingle<{ nombre: string }>();
    if (!d) return;

    // Busca al responsable del hospedaje vía la tabla responsabilidades
    // (fuente nueva de verdad). Esto incluye tanto a responsables puros
    // como a admins locales que también gestionan el hospedaje.
    const { data: resp } = await sb
      .from("responsabilidades")
      .select("perfil_id")
      .eq("entidad_tipo", "hospedaje")
      .eq("entidad_id", h.id)
      .maybeSingle<{ perfil_id: string }>();
    const perfil = resp?.perfil_id
      ? await sb
          .from("perfiles")
          .select("id, nombre")
          .eq("id", resp.perfil_id)
          .maybeSingle<{ id: string; nombre: string | null }>()
          .then((r) => r.data)
      : null;

    const disponibilidad = await getDisponibilidadFlag(
      h.id,
      consulta.check_in,
      consulta.check_out
    );

    const fechasCommon = {
      hospedajeNombre: h.nombre,
      destinoNombre: d.nombre,
      huespedNombre: consulta.nombre,
      huespedEmail: consulta.email,
      huespedWhatsapp: consulta.whatsapp,
      checkInFmt: formatDateISO(consulta.check_in),
      checkOutFmt: formatDateISO(consulta.check_out),
      cantidadHuespedes: consulta.cantidad_huespedes,
      adultos: consulta.adultos,
      ninos: consulta.ninos,
      bebes: consulta.bebes,
      unidadNombre,
      canalPreferido: consulta.canal_preferido,
      mensaje: consulta.mensaje,
      disponibilidad,
    };

    // Camino feliz: hay responsable asignado, le mandamos directo.
    if (perfil) {
      const { data: userInfo } = await sb.auth.admin.getUserById(perfil.id);
      const responsableEmail = userInfo?.user?.email ?? null;
      if (!responsableEmail) {
        console.warn("[notifyConsulta] Responsable sin email", perfil.id);
        // Cae al fallback de abajo.
      } else {
        const tpl = consultaNuevaTemplate({
          responsableNombre: perfil.nombre,
          urlPanelLeads: `${siteConfig.url}/panel/leads`,
          ...fechasCommon,
        });
        const result = await sendEmail({ to: responsableEmail, ...tpl });
        if (!result.ok) {
          console.error("[notifyConsulta] sendEmail responsable falló:", result.error);
        }
        return;
      }
    } else {
      console.warn(
        "[notifyConsulta] Hospedaje sin responsable, cayendo a fallback admins",
        h.id
      );
    }

    // Fallback: mandar a todos los admins del destino del hospedaje
    // (super admins con destino_id=null + admins locales con destino_id=h.destino_id).
    const { data: admins } = await sb
      .from("perfiles")
      .select("id, nombre")
      .eq("rol", "admin")
      .or(`destino_id.is.null,destino_id.eq.${h.destino_id}`)
      .returns<Array<{ id: string; nombre: string | null }>>();

    if (!admins || admins.length === 0) {
      console.error(
        "[notifyConsulta] Sin responsable ni admins para destino — consulta queda sin notificar",
        h.destino_id
      );
      return;
    }

    const urlHospedajeAdmin = `${siteConfig.url}/admin/hospedajes/${h.id}`;
    await Promise.all(
      admins.map(async (a) => {
        const { data: u } = await sb.auth.admin.getUserById(a.id);
        const adminEmail = u?.user?.email ?? null;
        if (!adminEmail) return;
        const tpl = consultaNuevaSinResponsableTemplate({
          adminNombre: a.nombre,
          urlHospedajeAdmin,
          ...fechasCommon,
        });
        const result = await sendEmail({ to: adminEmail, ...tpl });
        if (!result.ok) {
          console.error(
            "[notifyConsulta] sendEmail admin falló:",
            adminEmail,
            result.error
          );
        }
      })
    );
  } catch (e) {
    console.error("[notifyConsulta] Error:", e);
  }
}
