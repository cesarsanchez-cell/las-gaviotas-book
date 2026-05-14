import { z } from "zod";
import { AMENITY_KEYS } from "@/config/amenities";

const tipoEnum = z.enum([
  "hotel",
  "apart",
  "cabana",
  "hosteria",
  "camping",
  "casa",
  "departamento",
]);

const estadoEnum = z.enum([
  "borrador",
  "pendiente_validacion",
  "publicado",
  "pausado",
  "rechazado",
]);

const amenityEnum = z.enum(AMENITY_KEYS as [string, ...string[]]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const whatsappRegex = /^\+\d{10,15}$/;

export const hospedajeSchema = z.object({
  destino_id: z.string().uuid("Destino inválido"),
  localidad_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),

  slug: z
    .string()
    .min(3, "Slug muy corto")
    .max(80, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().min(3, "Mínimo 3 caracteres").max(120),
  tipo: tipoEnum,
  descripcion_corta: z
    .string()
    .min(20, "Mínimo 20 caracteres")
    .max(200, "Máximo 200 caracteres"),
  descripcion_larga: z
    .string()
    .max(5000, "Máximo 5000 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  capacidad_min: z.coerce.number().int().min(1).max(50).optional(),
  capacidad_max: z.coerce.number().int().min(1).max(100).optional(),
  cantidad_unidades: z.coerce.number().int().min(1).max(200).optional(),

  direccion: z.string().min(5, "Dirección requerida").max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  google_maps_url: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  whatsapp: z.string().regex(whatsappRegex, "Formato +5491155555555"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telefono: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  instagram: z
    .string()
    .max(40)
    .regex(/^[A-Za-z0-9._]*$/, "Solo letras, números, puntos y guiones bajos")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  website: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  amenities: z.array(amenityEnum).default([]),

  meta_title: z.string().max(70).optional().or(z.literal("").transform(() => undefined)),
  meta_description: z.string().max(180).optional().or(z.literal("").transform(() => undefined)),

  estado: estadoEnum.default("borrador"),

  responsable_nombre: z.string().min(2, "Nombre del responsable requerido").max(120),
  responsable_documento: z.string().max(40).optional().or(z.literal("").transform(() => undefined)),
  responsable_email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  responsable_whatsapp: z
    .string()
    .regex(whatsappRegex, "Formato +5491155555555")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  responsable_validado: z.coerce.boolean().default(false),

  destacado: z.coerce.boolean().default(false),
  orden_listado: z.coerce.number().int().min(0).max(10000).default(0),
});

export type HospedajeInput = z.infer<typeof hospedajeSchema>;

export function parseFormDataToHospedaje(formData: FormData): HospedajeInput {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "amenities") {
      raw.amenities ??= [];
      (raw.amenities as string[]).push(String(v));
    } else if (k === "destacado" || k === "responsable_validado") {
      // Checkboxes presentes en el FormData solo cuando están marcados.
      raw[k] = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // Empty string → key absent. Evita que z.coerce.number() devuelva NaN.
      // Los required fallarán con "Required" igual.
    } else {
      raw[k] = v;
    }
  }
  raw.amenities ??= [];
  // Booleans no marcados no vienen en FormData — setear false explícito.
  if (raw.destacado === undefined) raw.destacado = false;
  if (raw.responsable_validado === undefined) raw.responsable_validado = false;
  return hospedajeSchema.parse(raw);
}
