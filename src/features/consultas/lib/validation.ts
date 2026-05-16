import { z } from "zod";

const whatsappRegex = /^\+\d{8,15}$/;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

/**
 * Normaliza WhatsApp para usuarios argentinos.
 *
 * Reglas:
 * - Si viene vacío → undefined.
 * - Si empieza con `+` (formato internacional explícito) → se respeta tal cual,
 *   solo se sacan espacios/guiones/paréntesis (extranjeros).
 * - Sin `+` → asumimos celular argentino y prefijamos `+549`. Quitamos un `0`
 *   inicial si vino (formato `01155555555`).
 *
 * Ejemplos:
 *   "1155555555"      → "+5491155555555"
 *   "01155555555"     → "+5491155555555"
 *   "11 5555 5555"    → "+5491155555555"
 *   "+5491155555555"  → "+5491155555555"
 *   "+15551234567"    → "+15551234567"
 *   ""                → undefined
 */
export function normalizeWhatsApp(
  raw: string | null | undefined
): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (!cleaned) return undefined;
  if (cleaned.startsWith("+")) return cleaned;
  const noLeadingZero = cleaned.replace(/^0+/, "");
  if (!noLeadingZero) return undefined;
  return `+549${noLeadingZero}`;
}

/**
 * Schema de creación de consulta desde el form público.
 *
 * Reglas de fechas:
 * - check_in y check_out son strings ISO YYYY-MM-DD.
 * - check_in no puede ser anterior a hoy (validado por refinement, no por BD,
 *   porque la BD igual exige check_out > check_in y nuestro server action
 *   garantiza la fecha actual al momento del request).
 * - check_out debe ser estrictamente posterior a check_in.
 *
 * El honeypot `company` es un campo invisible que solo bots autocompletan.
 * Si viene cualquier cosa distinta de string vacío, la validación falla.
 */
export const consultaInputSchema = z
  .object({
    hospedajeId: z.string().uuid("Hospedaje inválido"),
    nombre: z
      .string()
      .trim()
      .min(2, "Nombre demasiado corto")
      .max(120, "Nombre demasiado largo"),
    email: z.string().trim().email("Email inválido"),
    whatsapp: z.preprocess(
      (v) => (typeof v === "string" ? normalizeWhatsApp(v) : undefined),
      z
        .string()
        .regex(
          whatsappRegex,
          "Formato inválido. Ej: 1155555555 (AR) o +5491155555555"
        )
        .optional()
    ),
    mensaje: z
      .string()
      .trim()
      .min(10, "Contanos un poco más (mínimo 10 caracteres)")
      .max(1000, "El mensaje es muy largo (máximo 1000 caracteres)"),
    checkIn: isoDate,
    checkOut: isoDate,
    cantidadHuespedes: z.coerce
      .number()
      .int("Tiene que ser un número entero")
      .min(1, "Al menos 1 huésped")
      .max(20, "Máximo 20 huéspedes"),
    consentimiento: z.boolean().refine((v) => v === true, {
      message: "Tenés que aceptar el uso de datos para enviar la consulta",
    }),
    /** Honeypot — debe venir vacío. */
    company: z
      .string()
      .max(0, "Spam detectado")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    path: ["checkOut"],
    message: "El check-out tiene que ser posterior al check-in",
  })
  .refine(
    (data) => {
      const today = new Date().toISOString().slice(0, 10);
      return data.checkIn >= today;
    },
    {
      path: ["checkIn"],
      message: "El check-in no puede ser una fecha pasada",
    }
  );

export type ConsultaInput = z.infer<typeof consultaInputSchema>;
