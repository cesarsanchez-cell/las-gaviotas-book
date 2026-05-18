import { z } from "zod";
import { UNIDAD_AMENITY_KEYS } from "@/config/amenities-unidad";

const amenityEnum = z.enum(UNIDAD_AMENITY_KEYS as [string, ...string[]]);

/**
 * Schema para alta y edición de un `unidad_type` (categoría comercial).
 *
 * Las amenities reusan el catálogo global `AMENITY_KEYS` — son las mismas que
 * en hospedajes (WiFi, AA, calefacción, cocina, ducha, etc). Si en el futuro
 * hace falta separar "amenities de hospedaje" vs "amenities de unidad", se
 * agrega un enum aparte sin romper datos.
 *
 * `capacidad_ninos`: niños ADICIONALES a los adultos. Capacidad total =
 * capacidad_adultos + capacidad_ninos. Cero por default (no se aceptan niños
 * o no aplica distinción).
 */
export const unidadTypeSchema = z.object({
  hospedaje_id: z.string().uuid("Hospedaje inválido"),
  nombre: z
    .string()
    .trim()
    .min(2, "Nombre demasiado corto (mínimo 2 caracteres)")
    .max(80, "Nombre demasiado largo (máximo 80 caracteres)"),
  descripcion: z
    .string()
    .trim()
    .max(2000, "Máximo 2000 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  capacidad_adultos: z.coerce
    .number()
    .int("Tiene que ser un número entero")
    .min(1, "Al menos 1 adulto")
    .max(30, "Máximo 30 adultos"),
  capacidad_ninos: z.coerce
    .number()
    .int("Tiene que ser un número entero")
    .min(0, "No puede ser negativo")
    .max(30, "Máximo 30 niños")
    .default(0),
  camas_descripcion: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  amenities: z.array(amenityEnum).default([]),
  activo: z.coerce.boolean().default(true),
  orden: z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .default(0),
});

export type UnidadTypeInput = z.infer<typeof unidadTypeSchema>;

/**
 * Parsea FormData → UnidadTypeInput con misma convención que hospedaje:
 * - Checkboxes ("activo") solo vienen en FormData cuando están marcados.
 * - Amenities llegan como entradas repetidas con el mismo `name="amenities"`.
 * - Strings vacíos se eliminan para que los campos opcionales caigan en
 *   undefined en lugar de "".
 */
export function parseFormDataToUnidadType(formData: FormData): UnidadTypeInput {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "amenities") {
      raw.amenities ??= [];
      (raw.amenities as string[]).push(String(v));
    } else if (k === "activo") {
      raw.activo = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // Empty string → key absent. Que los required fallen con "Required" y
      // los optional queden en undefined.
    } else {
      raw[k] = v;
    }
  }
  raw.amenities ??= [];
  // El checkbox `activo` no viene en FormData si está desmarcado; en alta
  // queremos default true (la BD ya tiene default), en edición depende del UI.
  if (raw.activo === undefined) raw.activo = true;
  return unidadTypeSchema.parse(raw);
}

// =============================================================================
// Unidades físicas
// =============================================================================

/**
 * Schema para alta o edición de una `unidad` física individual.
 *
 * `nombre` es lo único realmente propio (todo lo demás se hereda del
 * `unidad_type`). Suele ser una etiqueta corta tipo "Dúplex 1", "Cabaña A",
 * "Suite Norte".
 */
export const unidadSchema = z.object({
  unidad_type_id: z.string().uuid("Tipo de unidad inválido"),
  nombre: z
    .string()
    .trim()
    .min(1, "Poné un nombre")
    .max(60, "Máximo 60 caracteres"),
  activa: z.coerce.boolean().default(true),
  notas_internas: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
});

export type UnidadInput = z.infer<typeof unidadSchema>;

export function parseFormDataToUnidad(formData: FormData): UnidadInput {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "activa") {
      raw.activa = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // skip
    } else {
      raw[k] = v;
    }
  }
  if (raw.activa === undefined) raw.activa = true;
  return unidadSchema.parse(raw);
}

// =============================================================================
// Alta batch de unidades (wizard: "Cargar 3 dúplex con nombres Dúplex 1/2/3")
// =============================================================================

/**
 * Alta múltiple de unidades físicas a partir de un `unidad_type` ya creado.
 *
 * El responsable suele crear "Tipo Dúplex 6 pax" y después tildar
 * "Cantidad: 3" → el sistema genera "Dúplex 1", "Dúplex 2", "Dúplex 3"
 * automáticamente. `prefijo` es opcional: si no viene, usa el nombre del
 * `unidad_type`.
 */
export const createMultiplesUnidadesSchema = z
  .object({
    unidad_type_id: z.string().uuid("Tipo de unidad inválido"),
    cantidad: z.coerce
      .number()
      .int("Tiene que ser un número entero")
      .min(1, "Al menos 1 unidad")
      .max(50, "Máximo 50 unidades por operación"),
    prefijo: z
      .string()
      .trim()
      .max(60, "Máximo 60 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    inicio_numeracion: z.coerce
      .number()
      .int()
      .min(1, "El número de inicio debe ser ≥ 1")
      .max(999)
      .default(1),
  });

export type CreateMultiplesUnidadesInput = z.infer<
  typeof createMultiplesUnidadesSchema
>;
