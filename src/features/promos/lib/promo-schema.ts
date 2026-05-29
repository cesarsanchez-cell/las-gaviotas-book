import { z } from "zod";

const comercioTipoEnum = z.enum(["hospedaje", "gastronomico", "atractivo"]);

const dateOpt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const promoSchema = z
  .object({
    comercio_tipo: comercioTipoEnum,
    comercio_id: z.string().uuid("Comercio inválido"),
    titulo: z.string().min(3, "Mínimo 3 caracteres").max(120),
    bajada: z
      .string()
      .max(200, "Máximo 200 caracteres")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    beneficio: z.string().min(3, "Describí el beneficio").max(160),
    pct: z
      .number()
      .int()
      .min(1, "Entre 1 y 100")
      .max(100, "Entre 1 y 100")
      .nullable()
      .optional(),
    vigencia_desde: dateOpt,
    vigencia_hasta: dateOpt,
    activo: z.boolean().default(true),
  })
  .refine(
    (d) =>
      !d.vigencia_desde ||
      !d.vigencia_hasta ||
      d.vigencia_hasta >= d.vigencia_desde,
    { message: "La fecha de fin no puede ser anterior al inicio.", path: ["vigencia_hasta"] }
  );

export type PromoInput = z.infer<typeof promoSchema>;

/**
 * Lee un FormData del PromoForm. El select de comercio envía `comercio` con el
 * formato `${tipo}:${id}`. `pct` vacío → null. Fechas vacías → undefined.
 */
export function parseFormDataToPromo(fd: FormData) {
  const comercioRaw = String(fd.get("comercio") ?? "");
  const [comercio_tipo, comercio_id] = comercioRaw.split(":");
  const pctRaw = String(fd.get("pct") ?? "").trim();

  return {
    comercio_tipo,
    comercio_id,
    titulo: String(fd.get("titulo") ?? "").trim(),
    bajada: String(fd.get("bajada") ?? "").trim(),
    beneficio: String(fd.get("beneficio") ?? "").trim(),
    pct: pctRaw === "" ? null : Number(pctRaw),
    vigencia_desde: String(fd.get("vigencia_desde") ?? "").trim(),
    vigencia_hasta: String(fd.get("vigencia_hasta") ?? "").trim(),
    activo: fd.get("activo") === "on" || fd.get("activo") === "true",
  };
}
