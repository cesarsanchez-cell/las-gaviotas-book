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

/**
 * Escapa texto controlado por el usuario antes de interpolarlo en el HTML del
 * mail. Los campos del huésped (nombre/email/whatsapp) vienen de un form público
 * anónimo: sin esto, un nombre como `<a href="phish">` se renderiza en el inbox
 * del responsable (F-E2). El `mensaje` ya se escapa aparte por su tratamiento de
 * saltos de línea.
 */
const esc = (s: string | null | undefined): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export interface SubjectAndHtml {
  subject: string;
  html: string;
}

export function passwordRecoveryTemplate(args: {
  actionLink: string;
}): SubjectAndHtml {
  return {
    subject: "Recuperá tu contraseña — Mis Escapadas",
    html: wrap(
      `<h2 style="font-size:22px;margin:0 0 16px;">Recuperar contraseña</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Recibimos un pedido para restablecer la contraseña de tu cuenta en <strong>Mis Escapadas</strong>.</p>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Tocá el botón de abajo para definir una nueva contraseña. El link es válido por una hora.</p>` +
        button(args.actionLink, "Definir nueva contraseña") +
        `<p style="color:#64748b;font-size:13px;line-height:1.5;margin:16px 0 0;">Si no fuiste vos quien pidió este cambio, ignorá este mensaje. Tu contraseña seguirá siendo la misma.</p>` +
        `<p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;word-break:break-all;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br>${args.actionLink}</p>`
    ),
  };
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

/**
 * Arma una línea de "Huéspedes" rica si hay desglose, o cae al total simple.
 * Ej: "4 — 2 adultos, 1 niño, 1 bebé" o "4" si no hay desglose.
 */
function huespedesLine(args: {
  cantidadHuespedes: number;
  adultos?: number | null;
  ninos?: number | null;
  bebes?: number | null;
}): string {
  const total = args.cantidadHuespedes;
  if (args.adultos == null && args.ninos == null && args.bebes == null) {
    return String(total);
  }
  const parts: string[] = [];
  const a = args.adultos ?? 0;
  const n = args.ninos ?? 0;
  const b = args.bebes ?? 0;
  if (a > 0) parts.push(`${a} ${a === 1 ? "adulto" : "adultos"}`);
  if (n > 0) parts.push(`${n} ${n === 1 ? "niño" : "niños"}`);
  if (b > 0) parts.push(`${b} ${b === 1 ? "bebé" : "bebés"}`);
  return parts.length > 0 ? `${total} — ${parts.join(", ")}` : String(total);
}

function canalLine(canal: "mail" | "whatsapp" | null | undefined): string {
  if (!canal) return "";
  const label =
    canal === "whatsapp" ? "WhatsApp" : "Email";
  const icon = canal === "whatsapp" ? "💬" : "✉️";
  return `<tr><td style="padding:4px 0;color:#64748b;">Responder por:</td><td style="padding:4px 0;color:#0f172a;"><strong>${icon} ${label}</strong></td></tr>`;
}

function unidadLine(unidadNombre: string | null | undefined): string {
  if (!unidadNombre) return "";
  return `<tr><td style="padding:4px 0;color:#64748b;">Unidad consultada:</td><td style="padding:4px 0;color:#0f172a;"><strong>${unidadNombre}</strong></td></tr>`;
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
  /** Desglose pax — opcional, si la consulta vino del form por unidad. */
  adultos?: number | null;
  ninos?: number | null;
  bebes?: number | null;
  /** Nombre del unidad_type — opcional, si la consulta es contextualizada. */
  unidadNombre?: string | null;
  /** Canal preferido elegido por el usuario — opcional. */
  canalPreferido?: "mail" | "whatsapp" | null;
  mensaje: string;
  urlPanelLeads: string;
  /** Estado de disponibilidad del hospedaje para el rango. NULL = sin info. */
  disponibilidad?: DisponibilidadFlag;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  const whatsappLine = args.huespedWhatsapp
    ? `<tr><td style="padding:4px 0;color:#64748b;">WhatsApp:</td><td style="padding:4px 0;color:#0f172a;"><a href="https://wa.me/${args.huespedWhatsapp.replace(/[^0-9]/g, "")}" style="color:#0f172a;text-decoration:underline;">${esc(args.huespedWhatsapp)}</a></td></tr>`
    : "";
  const huespedes = huespedesLine(args);
  const subjectUnidad = args.unidadNombre
    ? `Nueva consulta — ${args.hospedajeNombre} · ${args.unidadNombre} (${args.checkInFmt} → ${args.checkOutFmt})`
    : `Nueva consulta para ${args.hospedajeNombre} (${args.checkInFmt} → ${args.checkOutFmt})`;
  return {
    subject: subjectUnidad,
    html: wrap(
      `<h2 style="font-size:22px;margin-bottom:8px;">Nueva consulta recibida</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} alguien pregunta por <strong>${args.hospedajeNombre}</strong>${args.unidadNombre ? ` — <strong>${args.unidadNombre}</strong>` : ""} en Mis Escapadas a ${args.destinoNombre}.</p>` +
        disponibilidadBanner(args.disponibilidad ?? null) +
        `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0;">` +
        unidadLine(args.unidadNombre) +
        `<tr><td style="padding:4px 0;color:#64748b;width:140px;">Nombre:</td><td style="padding:4px 0;color:#0f172a;"><strong>${esc(args.huespedNombre)}</strong></td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Email:</td><td style="padding:4px 0;color:#0f172a;"><a href="mailto:${esc(args.huespedEmail)}" style="color:#0f172a;text-decoration:underline;">${esc(args.huespedEmail)}</a></td></tr>` +
        whatsappLine +
        canalLine(args.canalPreferido) +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-in:</td><td style="padding:4px 0;color:#0f172a;">${args.checkInFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-out:</td><td style="padding:4px 0;color:#0f172a;">${args.checkOutFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Huéspedes:</td><td style="padding:4px 0;color:#0f172a;">${huespedes}</td></tr>` +
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
  adultos?: number | null;
  ninos?: number | null;
  bebes?: number | null;
  unidadNombre?: string | null;
  canalPreferido?: "mail" | "whatsapp" | null;
  mensaje: string;
  urlHospedajeAdmin: string;
  disponibilidad?: DisponibilidadFlag;
}): SubjectAndHtml {
  const saludo = args.adminNombre ? `Hola ${args.adminNombre},` : "Hola,";
  const whatsappLine = args.huespedWhatsapp
    ? `<tr><td style="padding:4px 0;color:#64748b;">WhatsApp:</td><td style="padding:4px 0;color:#0f172a;"><a href="https://wa.me/${args.huespedWhatsapp.replace(/[^0-9]/g, "")}" style="color:#0f172a;text-decoration:underline;">${esc(args.huespedWhatsapp)}</a></td></tr>`
    : "";
  const huespedes = huespedesLine(args);
  return {
    subject: `[Sin responsable] Nueva consulta para ${args.hospedajeNombre} (${args.checkInFmt} → ${args.checkOutFmt})`,
    html: wrap(
      `<h2 style="font-size:22px;margin-bottom:8px;">Consulta sin responsable asignado</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} llegó una consulta para <strong>${args.hospedajeNombre}</strong>${args.unidadNombre ? ` — <strong>${args.unidadNombre}</strong>` : ""} en Mis Escapadas a ${args.destinoNombre}, pero este hospedaje todavía no tiene responsable asignado, así que te avisamos a vos.</p>` +
        `<div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;margin:16px 0;color:#78350f;font-size:14px;line-height:1.5;">Acción sugerida: contactá al huésped directo y asigná un responsable al hospedaje para que las próximas consultas le lleguen automáticamente.</div>` +
        disponibilidadBanner(args.disponibilidad ?? null) +
        `<table style="width:100%;font-size:14px;border-collapse:collapse;margin:16px 0;">` +
        unidadLine(args.unidadNombre) +
        `<tr><td style="padding:4px 0;color:#64748b;width:140px;">Nombre:</td><td style="padding:4px 0;color:#0f172a;"><strong>${esc(args.huespedNombre)}</strong></td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Email:</td><td style="padding:4px 0;color:#0f172a;"><a href="mailto:${esc(args.huespedEmail)}" style="color:#0f172a;text-decoration:underline;">${esc(args.huespedEmail)}</a></td></tr>` +
        whatsappLine +
        canalLine(args.canalPreferido) +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-in:</td><td style="padding:4px 0;color:#0f172a;">${args.checkInFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Check-out:</td><td style="padding:4px 0;color:#0f172a;">${args.checkOutFmt}</td></tr>` +
        `<tr><td style="padding:4px 0;color:#64748b;">Huéspedes:</td><td style="padding:4px 0;color:#0f172a;">${huespedes}</td></tr>` +
        `</table>` +
        `<div style="background:#f8fafc;border-left:3px solid #0f172a;padding:12px 16px;margin:16px 0;color:#0f172a;font-size:14px;line-height:1.6;white-space:pre-line;">${args.mensaje.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>` +
        button(args.urlHospedajeAdmin, "Ver hospedaje en el admin")
    ),
  };
}

// =============================================================================
// Lugares (gastronómicos): aprobación / rechazo
// =============================================================================
// El responsable de un gastronómico recibe estos mails al cambiar el estado.
// Atractivos no tienen responsable — no se notifica nada.

export function lugarPublicadoTemplate(args: {
  responsableNombre: string | null;
  lugarNombre: string;
  destinoNombre: string;
  urlPublica: string;
  urlPanel: string;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  return {
    subject: `Tu local fue publicado en Mis Escapadas a ${args.destinoNombre}`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">¡Tu local ya está publicado!</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} <strong>${args.lugarNombre}</strong> ya aparece en <strong>Mis Escapadas a ${args.destinoNombre}</strong> y puede ser descubierto por los viajeros que llegan al destino.</p>` +
        button(args.urlPublica, "Ver mi local publicado") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:16px 0 0;">Desde tu <a href="${args.urlPanel}" style="color:#0f172a;text-decoration:underline;">panel</a> podés editar datos, sumar fotos o cambiar tus horarios.</p>` +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Gracias por sumarte a la comunidad gastronómica de ${args.destinoNombre}.</p>`
    ),
  };
}

export function lugarRechazadoTemplate(args: {
  responsableNombre: string | null;
  lugarNombre: string;
  destinoNombre: string;
  motivo: string;
  urlPanel: string;
}): SubjectAndHtml {
  const saludo = args.responsableNombre
    ? `Hola ${args.responsableNombre},`
    : "Hola,";
  return {
    subject: `Revisamos tu local en Mis Escapadas a ${args.destinoNombre}`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">Revisamos tu local</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">${saludo} revisamos <strong>${args.lugarNombre}</strong> y todavía no podemos publicarlo en Mis Escapadas a ${args.destinoNombre}. Te dejamos abajo el detalle:</p>` +
        `<div style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 16px;margin:16px 0;color:#7f1d1d;font-size:14px;line-height:1.6;">${args.motivo.replace(/\n/g, "<br>")}</div>` +
        `<p style="color:#334155;line-height:1.6;margin:16px 0;">Ajustá lo que haga falta desde tu panel y volvelo a enviar a revisión.</p>` +
        button(args.urlPanel, "Editar mi local") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Si tenés dudas sobre el motivo, respondé a este mail y te ayudamos.</p>`
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

export function hospedajeInvitacionTemplate(args: {
  hospedajeNombre: string;
  destinoNombre: string;
  urlPanel: string;
}): SubjectAndHtml {
  return {
    subject: `Invitación: completá tu hospedaje en Mis Escapadas a ${args.destinoNombre}`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">Te invitamos a Mis Escapadas</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Hola, alguien del equipo de <strong>Mis Escapadas a ${args.destinoNombre}</strong> te está invitando a publicar <strong>${esc(args.hospedajeNombre)}</strong> en nuestro portal.</p>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Para completar los datos de tu hospedaje (fotos, descripción detallada, amenities, etc.) tocá el botón de abajo.</p>` +
        button(args.urlPanel, "Completar datos de mi hospedaje") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Si no tenés una cuenta aún, la crearemos automáticamente usando este email. Una vez confirmés tu email podrás ingresar y completar todos los detalles.</p>` +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">¿Preguntas? Respondé a este mail y te ayudamos.</p>`
    ),
  };
}

export function responsableInvitacionTemplate(args: {
  nombre: string;
  registroUrl: string;
}): SubjectAndHtml {
  return {
    subject: `Te invitamos a publicar tu hospedaje, gastronómico o atracción en Mis Escapadas`,
    html: wrap(
      `<h2 style="font-size:24px;margin-bottom:16px;">¡Te invitamos a Mis Escapadas!</h2>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Hola ${esc(args.nombre)},</p>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">El equipo de <strong>Mis Escapadas</strong> te está invitando a publicar tu hospedaje, gastronómico o atracción en nuestro portal turístico.</p>` +
        `<p style="color:#334155;line-height:1.6;margin:0 0 16px;">Tocá el botón de abajo para crear tu cuenta y comenzar a cargar tus datos.</p>` +
        button(args.registroUrl, "Crear mi cuenta") +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">Una vez te registres, confirmás tu email y accedés a tu panel donde podés cargar fotos, datos de contacto, horarios, amenities y mucho más.</p>` +
        `<p style="color:#64748b;font-size:14px;line-height:1.5;">¿Preguntas? Respondé a este mail y te ayudamos.</p>`
    ),
  };
}
