import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato YYYY-MM-DD");

export const tarifaInputSchema = z
  .object({
    unidadTypeId: z.string().uuid(),
    nombre: z
      .string()
      .trim()
      .min(2, "Nombre muy corto")
      .max(80, "Máximo 80 caracteres"),
    desde: isoDate,
    hasta: isoDate,
    precioNoche: z.coerce
      .number()
      .min(0, "Precio inválido")
      .max(9_999_999, "Precio demasiado alto"),
    moneda: z.enum(["ARS", "USD"]),
    notas: z
      .string()
      .trim()
      .max(500)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.hasta >= d.desde, {
    path: ["hasta"],
    message: "La fecha hasta tiene que ser mayor o igual a desde",
  });

export type TarifaInput = z.infer<typeof tarifaInputSchema>;

export const tarifaUpdateSchema = tarifaInputSchema.innerType().extend({
  id: z.string().uuid(),
});

export type TarifaUpdateInput = z.infer<typeof tarifaUpdateSchema>;
