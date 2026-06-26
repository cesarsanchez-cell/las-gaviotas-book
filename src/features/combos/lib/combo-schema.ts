import { z } from "zod";

const comercioTipoEnum = z.enum(["hospedaje", "gastronomico", "atractivo"]);

export const comboItemSchema = z.object({
  comercio_tipo: comercioTipoEnum,
  comercio_id: z.string().uuid("Comercio inválido"),
  beneficio: z.string().min(3, "Describí el beneficio del item").max(200),
});

export const comboSchema = z.object({
  titulo: z.string().min(3, "Mínimo 3 caracteres").max(120),
  bajada: z
    .string()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  noches: z.number().int().min(1, "Mínimo 1 noche").max(60),
  precio_desde: z.number().int().min(0).nullable().optional(),
  ahorro_pct: z.number().int().min(1, "Mínimo 1%").max(100).nullable().optional(),
  validez: z
    .string()
    .max(160)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  beneficios: z.array(z.string().min(2).max(200)).max(6).default([]),
  comercio_principal: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  items: z
    .array(comboItemSchema)
    .min(2, "Un combo necesita al menos 2 comercios")
    .max(3, "Máximo 3 comercios por combo"),
});

export type ComboInput = z.infer<typeof comboSchema>;

/**
 * Lee el FormData del ComboForm. Los items y beneficios se mandan serializados
 * en JSON (el form los maneja como arrays dinámicos). Cada item del form trae
 * `comercio` con formato `${tipo}:${id}` + `beneficio`.
 */
export function parseFormDataToCombo(fd: FormData) {
  const num = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : Number(s);
  };

  let itemsRaw: Array<{ comercio?: string; beneficio?: string }> = [];
  let beneficiosRaw: string[] = [];
  try {
    itemsRaw = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    itemsRaw = [];
  }
  try {
    beneficiosRaw = JSON.parse(String(fd.get("beneficios") ?? "[]"));
  } catch {
    beneficiosRaw = [];
  }

  const items = itemsRaw.map((it) => {
    const [comercio_tipo, comercio_id] = String(it.comercio ?? "").split(":");
    return {
      comercio_tipo,
      comercio_id,
      beneficio: String(it.beneficio ?? "").trim(),
    };
  });

  return {
    titulo: String(fd.get("titulo") ?? "").trim(),
    bajada: String(fd.get("bajada") ?? "").trim(),
    noches: num(fd.get("noches")) ?? 1,
    precio_desde: num(fd.get("precio_desde")),
    ahorro_pct: num(fd.get("ahorro_pct")),
    validez: String(fd.get("validez") ?? "").trim(),
    comercio_principal: String(fd.get("comercio_principal") ?? "").trim(),
    beneficios: beneficiosRaw
      .map((b) => String(b).trim())
      .filter((b) => b.length > 0),
    items,
  };
}
