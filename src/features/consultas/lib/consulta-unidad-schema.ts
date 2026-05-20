import { z } from "zod";
import { normalizeWhatsApp } from "@/features/consultas/lib/validation";

const whatsappRegex = /^\+\d{8,15}$/;
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

/**
 * Schema de creación de consulta contextualizada a una unidad puntual.
 * Vive en archivo aparte porque el modulo de actions usa "use server" y
 * ahi solo pueden exportarse funciones async.
 */
export const consultaUnidadInputSchema = z
  .object({
    hospedajeId: z.string().uuid("Hospedaje inválido"),
    unidadTypeId: z.string().uuid("Unidad inválida"),
    checkIn: isoDate,
    checkOut: isoDate,
    adultos: z.coerce.number().int().min(1).max(20),
    ninos: z.coerce.number().int().min(0).max(20),
    bebes: z.coerce.number().int().min(0).max(10),
    nombre: z.string().trim().min(2, "Nombre demasiado corto").max(120),
    email: z.string().trim().email("Email inválido"),
    whatsapp: z.preprocess(
      (v) => (typeof v === "string" ? normalizeWhatsApp(v) : undefined),
      z
        .string()
        .regex(whatsappRegex, "Formato inválido")
        .optional()
    ),
    mensaje: z
      .string()
      .trim()
      .min(10, "Contanos un poco más (mínimo 10 caracteres)")
      .max(1000),
    canalPreferido: z.enum(["mail", "whatsapp"]),
    consentimiento: z.boolean().refine((v) => v === true, {
      message: "Tenés que aceptar el uso de datos",
    }),
    company: z
      .string()
      .max(0, "Spam detectado")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    path: ["checkOut"],
    message: "Las fechas no son coherentes",
  })
  .refine(
    (data) => {
      if (data.canalPreferido === "whatsapp" && !data.whatsapp) return false;
      return true;
    },
    {
      path: ["whatsapp"],
      message: "Para responderte por WhatsApp necesitamos tu número",
    }
  );

export type ConsultaUnidadInput = z.infer<typeof consultaUnidadInputSchema>;
