import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

/**
 * Campo numérico opcional que llega del form como string. "" o ausente →
 * undefined; cualquier otra cosa se coacciona a número y se valida en rango.
 */
function optionalIntInRange(min: number, max: number, msg: string) {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(min, msg).max(max, msg).optional()
  );
}

const restriccionBaseShape = {
  unidadTypeId: z.string().uuid(),
  nombre: z
    .string()
    .trim()
    .min(2, "Nombre muy corto")
    .max(80, "Máximo 80 caracteres"),
  desde: isoDate,
  hasta: isoDate,
  estadiaMinimaNoches: optionalIntInRange(
    1,
    365,
    "Estadía mínima entre 1 y 365 noches"
  ),
  diaIngreso: optionalIntInRange(1, 7, "Día de ingreso inválido"),
  diaEgreso: optionalIntInRange(1, 7, "Día de egreso inválido"),
  notas: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
} as const;

const rangoCoherente = (d: { desde: string; hasta: string }) =>
  d.hasta >= d.desde;
const rangoCoherenteMsg = {
  path: ["hasta"] as (string | number)[],
  message: "La fecha hasta tiene que ser mayor o igual a desde",
};

const alMenosUnaRegla = (d: {
  estadiaMinimaNoches?: number;
  diaIngreso?: number;
  diaEgreso?: number;
}) =>
  d.estadiaMinimaNoches != null ||
  d.diaIngreso != null ||
  d.diaEgreso != null;
const alMenosUnaReglaMsg = {
  path: ["estadiaMinimaNoches"] as (string | number)[],
  message:
    "Definí al menos una regla: estadía mínima, día de ingreso o día de egreso",
};

export const restriccionInputSchema = z
  .object(restriccionBaseShape)
  .refine(rangoCoherente, rangoCoherenteMsg)
  .refine(alMenosUnaRegla, alMenosUnaReglaMsg);

export type RestriccionInput = z.infer<typeof restriccionInputSchema>;

export const restriccionUpdateSchema = z
  .object({ ...restriccionBaseShape, id: z.string().uuid() })
  .refine(rangoCoherente, rangoCoherenteMsg)
  .refine(alMenosUnaRegla, alMenosUnaReglaMsg);

export type RestriccionUpdateInput = z.infer<typeof restriccionUpdateSchema>;
