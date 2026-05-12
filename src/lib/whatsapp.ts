// Helpers para generar URLs y mensajes prefill de WhatsApp.

/**
 * Limpia un número de teléfono dejándolo en formato wa.me-compatible:
 * solo dígitos, sin "+", sin espacios, sin guiones.
 */
export function normalizeWhatsApp(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

interface WhatsAppLinkParams {
  whatsapp: string;
  hospedajeNombre?: string;
  mensaje?: string;
}

/**
 * Genera URL wa.me con mensaje prefill.
 * Si no se pasa mensaje, se arma uno genérico para consulta de disponibilidad.
 */
export function buildWhatsAppUrl({
  whatsapp,
  hospedajeNombre,
  mensaje,
}: WhatsAppLinkParams): string {
  const number = normalizeWhatsApp(whatsapp);
  const text =
    mensaje ??
    (hospedajeNombre
      ? `Hola, vi ${hospedajeNombre} en Las Gaviotas BOOK y quería consultar por disponibilidad.`
      : "Hola, vi su hospedaje en Las Gaviotas BOOK y quería consultar.");

  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
