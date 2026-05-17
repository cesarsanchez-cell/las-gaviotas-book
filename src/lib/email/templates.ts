/**
 * Templates HTML para mails transaccionales de la app (no Auth).
 * Tono: español de Argentina, voseo, sobrio. Estilos inline porque los
 * clientes de mail no cargan CSS externo.
 *
 * El SubjectAndHtml shape devuelve subject + html para pasar directo a
 * `sendEmail`.
 */

const BRAND_FOOTER = `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"><p style="color:#94a3b8;font-size:12px;font-family:system-ui,sans-serif;">Mis Escapadas — Red de portales turísticos locales</p>`;

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">${inner}${BRAND_FOOTER}</div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${href}" style="background:#0f172a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">${label}</a></p>`;

export interface SubjectAndHtml {
  subject: string;
  html: string;
}

export function hospedajeAprobadoTemplate(args: {
  responsableNombre: string | null;
  hospedajeNombre: string;
  destinoNombre: string;
  urlPublica: string;
  urlPanel: string;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  return {
    subject: `Tu hospedaje fue aprobado en Mis Escapadas a ${args.destinoNombre}`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">¡Tu hospedaje fue aprobado!</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} <strong>${args.hospedajeNombre}</strong> ya está publicado en <strong>Mis Escapadas a ${args.destinoNombre}</strong> y puede ser encontrado por viajeros que buscan dónde quedarse.</p>` +
        button(args.urlPublica, "Ver mi hospedaje publicado") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:16px 0 0;">Desde tu <a href="${args.urlPanel}" style="color:#0f172a;text-decoration:underline;">panel</a> podés editar datos, sumar fotos o pausarlo temporalmente.</p>` +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Gracias por sumarte a la comunidad de hospedajes de ${args.destinoNombre}.</p>`
    ),
  };
}

export type DisponibilidadFlag = "disponible" | "ocupado" | "parcial" | null;

function disponibilidadBanner(d: DisponibilidadFlag): string {
  if (d === null) return "";
  if (d === "disponible") {
    return `<div style="background:#ecfdf5;border-left:3px solid #10b981;padding:10px 14px;margin:0 0 16px;color:#065f46;font-size:13px;line-height:1.5;"><strong>✓ Disponible</strong> según tu calendario para esas fechas.</div>`;
  }
  if (d === "ocupado") {
    return `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:10px 14px;margin:0 0 16px;color:#7f1d1d;font-size:13px;line-height:1.5;"><strong>✗ Ocupado</strong> según tu calendario. Igual respondele al huésped si podés ofrecerle otras fechas.</div>`;
  }
  return `<div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:10px 14px;margin:0 0 16px;color:#78350f;font-size:13px;line-height:1.5;"><strong>⚠ Parcialmente ocupado</strong> según tu calendario. Algunos días del rango están bloqueados.</div>`;
}

export function consultaNuevaTemplate(args: {
  responsableNombre: string | null;
  hospedajeNombre: string;
  destinoNombre: string;
  /** Datos del huésped que llenó el form. */
  huespedNombre: string;
  huespedEmail: string;
  huespedWhatsapp: string | null;
  /** Fechas ISO YYYY-MM-DD ya formateadas como dd/mm/yyyy. */
  checkInFmt: string;
  checkOutFmt: string;
  cantidadHuespedes: number;
  mensaje: string;
  urlPanelLeads: string;
  /** Estado de disponibilidad del hospedaje para el rango. NULL = sin info. */
  disponibilidad?: DisponibilidadFlag;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  const whatsappLine = args.huespedWhatsapp
    ? `<tr><td style="padding:4px 0;color:#64748b;">WhatsApp:</td><td style="padding:4px 0;color:#0f172a;"><a href="https://wa.me/${args.huespedWhatsapp.replace(/[^0-9]/g, "")}" style="color:#0f172a;text-decoration:underline;">${args.huespedWhatsapp}</a></td></tr>`
    : "";
  return {
    subject: `Nueva consulta para ${args.hospedajeNombre} (${args.checkInFmt} → ${args.checkOutFmt})`,
    html: wrap(
      `<h2 style="font-size:22px;margin-bottom:8px;">Nueva consulta recibida</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} alguien pregunta por <strong>${args.hospedajeNombre}</strong> en Mis Escapadas a ${args.destinoNombre}.</p>` +
        disponibilidadBanner(args.disponibilidad ?? null) +
        `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0;">` +
        `<tr><td style="padding:4px 0;color:#64748b;width:120px;">Nombre:</td><td style="padding:4px 0;color:#0f172a;"><strong>${args.huespedNombre}</strong></td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Email:</td><td style="padding:4px 0;color:#0f172a;"><a href="mailto:${args.huespedEmail}" style="color:#0f172a;text-decoration:underline;">${args.huespedEmail}</a></td></tr>` +
        whatsappLine +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-in:</td><td style="padding:4px 0;color:#0f172a;">${args.checkInFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-out:</td><td style="padding:4px 0;color:#0f172a;">${args.checkOutFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Huéspedes:</td><td style="padding:4px 0;color:#0f172a;">${args.cantidadHuespedes}</td></tr>` +
        `</table>` +
        `<div style="background:#f8fafc;border-left:3px solid #0f172a;padding:12px 16px;margin:16px 0;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-line;">${args.mensaje.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>` +
        `<p style="color:#334155;line-height:1.6;margin:16px 0;">Respondé directo al huésped por mail o WhatsApp. Desde tu bandeja podés marcarla como respondida.</p>` +
        button(args.urlPanelLeads, "Ver mis consultas")
    ),
  };
}

/**
 * Variante de consulta cuando el hospedaje destinatario NO tiene responsable
 * asignado — el mail se manda al admin (super admin del destino o admin local).
 * El admin tiene que contactar al huésped manualmente y/o asignar un responsable
 * al hospedaje para que las próximas consultas vayan directo.
 */
export function consultaNuevaSinResponsableTemplate(args: {
  adminNombre: string | null;
  hospedajeNombre: string;
  destinoNombre: string;
  huespedNombre: string;
  huespedEmail: string;
  huespedWhatsapp: string | null;
  checkInFmt: string;
  checkOutFmt: string;
  cantidadHuespedes: number;
  mensaje: string;
  urlHospedajeAdmin: string;
  disponibilidad?: DisponibilidadFlag;
}): SubjectAndHtml {
  const saludo = args.adminNombre ? `Hola ${args.adminNombre},` : "Hola,";
  const whatsappLine = args.huespedWhatsapp
    ? `<tr><td style="padding:4px 0;color:#64748b;">WhatsApp:</td><td style="padding:4px 0;color:#0f172a;"><a href="https://wa.me/${args.huespedWhatsapp.replace(/[^0-9]/g, "")}" style="color:#0f172a;text-decoration:underline;">${args.huespedWhatsapp}</a></td></tr>`
    : "";
  return {
    subject: `[Sin responsable] Nueva consulta para ${args.hospedajeNombre} (${args.checkInFmt} → ${args.checkOutFmt})`,
    html: wrap(
      `<h2 style="font-size:22px;margin-bottom:8px;">Consulta sin responsable asignado</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} llegó una consulta para <strong>${args.hospedajeNombre}</strong> en Mis Escapadas a ${args.destinoNombre}, pero este hospedaje todavía no tiene responsable asignado, así que te avisamos a vos.</p>` +
        `<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;margin:16px 0;color:#78350f;font-size:14px;line-height:1.5;">Acción sugerida: contactá al huésped directo y asigná un responsable al hospedaje para que las próximas consultas le lleguen automáticamente.</div>` +
        disponibilidadBanner(args.disponibilidad ?? null) +
        `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0;">` +
        `<tr><td style="padding:4px 0;color:#64748b;width:120px;">Nombre:</td><td style="padding:4px 0;color:#0f172a;"><strong>${args.huespedNombre}</strong></td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Email:</td><td style="padding:4px 0;color:#0f172a;"><a href="mailto:${args.huespedEmail}" style="color:#0f172a;text-decoration:underline;">${args.huespedEmail}</a></td></tr>` +
        whatsappLine +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-in:</td><td style="padding:4px 0;color:#0f172a;">${args.checkInFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-out:</td><td style="padding:4px 0;color:#0f172a;">${args.checkOutFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Huéspedes:</td><td style="padding:4px 0;color:#0f172a;">${args.cantidadHuespedes}</td></tr>` +
        `</table>` +
        `<div style="background:#f8fafc;border-left:3px solid #0f172a;padding:12px 16px;margin:16px 0;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-line;">${args.mensaje.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>` +
        button(args.urlHospedajeAdmin, "Ver hospedaje en el admin")
    ),
  };
}

export function hospedajeRechazadoTemplate(args: {
  responsableNombre: string | null;
  hospedajeNombre: string;
  destinoNombre: string;
  motivo: string;
  urlPanel: string;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  return {
    subject: `Revisamos tu hospedaje en Mis Escapadas a ${args.destinoNombre}`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">Revisamos tu hospedaje</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} revisamos <strong>${args.hospedajeNombre}</strong> y todavía no podemos publicarlo en Mis Escapadas a ${args.destinoNombre}. Te dejamos abajo el detalle:</p>` +
        `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 16px;margin:16px 0;color:#7f1d1d;font-size:14px;line-height:1.6;">${args.motivo.replace(/\n/g, "<br>")}</div>` +
        `<p style="color:#334155;line-height:1.6;margin:16px 0;">Hacé los ajustes desde tu panel y volvelo a enviar a revisión cuando esté listo.</p>` +
        button(args.urlPanel, "Editar mi hospedaje") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Si tenés dudas sobre el motivo, respondé a este mail y te ayudamos.</p>`
    ),
  };
}
