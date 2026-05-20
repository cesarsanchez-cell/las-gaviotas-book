import { z } from "zod";
import {
  CATEGORIAS_GASTRONOMICO_KEYS,
  CATEGORIAS_ATRACTIVO_KEYS,
} from "@/config/categorias-lugar";
import { normalizeWhatsApp } from "@/features/consultas/lib/validation";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const whatsappRegex = /^\+\d{10,15}$/;

const tipoEnum = z.enum(["gastronomico", "atractivo"]);

const estadoEnum = z.enum([
  "borrador",
  "pendiente_validacion",
  "publicado",
  "pausado",
  "rechazado",
]);

const categoriaGastroEnum = z.enum(
  CATEGORIAS_GASTRONOMICO_KEYS as [string, ...string[]]
);
const categoriaAtractivoEnum = z.enum(
  CATEGORIAS_ATRACTIVO_KEYS as [string, ...string[]]
);

/**
 * Horarios: objeto libre con claves día-corta (lun/mar/mie/jue/vie/sab/dom)
 * y valores string ("12:00-15:00, 20:00-00:00") o null/undefined (cerrado).
 * Validamos shape pero NO formato de hora — eso vive en el form.
 */
const diasSemana = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;

const horariosSchema = z
  .record(z.enum(diasSemana), z.string().nullable().optional())
  .optional();

// -----------------------------------------------------------------------------
// Campos comunes
// -----------------------------------------------------------------------------

const baseSchema = z.object({
  destino_id: z.string().uuid("Destino inválido"),
  localidad_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),

  slug: z
    .string()
    .min(3, "Slug muy corto")
    .max(80, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().min(3, "Mínimo 3 caracteres").max(120),
  descripcion_corta: z
    .string()
    .min(20, "Mínimo 20 caracteres")
    .max(200, "Máximo 200 caracteres"),
  descripcion_larga: z
    .string()
    .max(5000, "Máximo 5000 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  direccion: z
    .string()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  google_maps_url: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: z.preprocess(
    (v) => (typeof v === "string" ? normalizeWhatsApp(v) : v),
    z
      .string()
      .regex(whatsappRegex, "Ingresá un teléfono válido. Ej: 1155555555")
      .optional()
      .or(z.literal("").transform(() => undefined))
  ),
  instagram: z
    .string()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  website: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  destacado: z.coerce.boolean().optional(),
  imperdible: z.coerce.boolean().optional(),

  meta_title: z
    .string()
    .max(70)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  meta_description: z
    .string()
    .max(180)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// -----------------------------------------------------------------------------
// Variantes por tipo (discriminated union)
// -----------------------------------------------------------------------------

/**
 * Gastronómico: el contacto es CORE — el huésped llega para reservar mesa o
 * preguntar. WhatsApp obligatorio. Horarios opcionales pero recomendados.
 */
export const gastronomicoSchema = baseSchema.extend({
  tipo: z.literal("gastronomico"),
  categoria: categoriaGastroEnum,
  whatsapp: z.preprocess(
    (v) => (typeof v === "string" ? normalizeWhatsApp(v) : v),
    z.string().regex(whatsappRegex, "Ingresá un WhatsApp válido. Ej: 1155555555")
  ),
  horarios: horariosSchema,
});

/**
 * Atractivo: lugar público, no necesariamente tiene contacto. WhatsApp y
 * horarios son irrelevantes (no se reserva una playa). Si vienen, los
 * rechazamos para mantener limpia la BD.
 */
export const atractivoSchema = baseSchema.extend({
  tipo: z.literal("atractivo"),
  categoria: categoriaAtractivoEnum,
  whatsapp: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .transform((v) => (v ? normalizeWhatsApp(v) : undefined))
    .pipe(
      z
        .string()
        .regex(whatsappRegex, "Si lo cargás, formato +5491155555555")
        .optional()
    ),
  horarios: z.undefined().or(z.null()),
});

export const lugarSchema = z.discriminatedUnion("tipo", [
  gastronomicoSchema,
  atractivoSchema,
]);

export type LugarInput = z.infer<typeof lugarSchema>;
export type GastronomicoInput = z.infer<typeof gastronomicoSchema>;
export type AtractivoInput = z.infer<typeof atractivoSchema>;

// -----------------------------------------------------------------------------
// FormData parser
// -----------------------------------------------------------------------------

/**
 * Convierte un `FormData` a `unknown` para que el caller corra `lugarSchema.safeParse`.
 * Maneja:
 *   - `imperdible` y `destacado` como `"on"` (checkbox) o string truthy.
 *   - `horarios` viene como JSON string serializado (el form lo arma con JS).
 *
 * No prejuzga `tipo` — el discriminated union lo resuelve después.
 */
export function parseFormDataToLugar(fd: FormData): unknown {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") obj[k] = v;
  }

  obj.imperdible = obj.imperdible === "on" || obj.imperdible === "true";
  obj.destacado = obj.destacado === "on" || obj.destacado === "true";

  // horarios viene como JSON string del form (lo arma el cliente). Si no
  // viene o viene vacío, queda undefined. Si viene mal-formado, parseo a
  // null para que safeParse no rompa antes de tiempo.
  if (typeof obj.horarios === "string" && obj.horarios.trim()) {
    try {
      obj.horarios = JSON.parse(obj.horarios);
    } catch {
      obj.horarios = null;
    }
  } else {
    delete obj.horarios;
  }

  return obj;
}

export const lugarEstadoEnum = estadoEnum;
export const lugarTipoEnum = tipoEnum;
