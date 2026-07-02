import { z } from "zod";

const scopeType = z.enum(["ciudad", "zona", "destino"], {
  errorMap: () => ({ message: "Scope debe ser ciudad, zona o destino" }),
});

export const crearDatoUtilSchema = z.object({
  rubroId: z.string().uuid("Rubro inválido"),
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  direccion: z.string().max(200).nullable().optional(),
  contacto: z.string().max(100).nullable().optional(),
  scopeType: scopeType,
  scopeId: z.string().uuid("ID de scope inválido"),
});

export const actualizarDatoUtilSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  direccion: z.string().max(200).nullable().optional(),
  contacto: z.string().max(100).nullable().optional(),
});

export type CrearDatoUtilInput = z.infer<typeof crearDatoUtilSchema>;
export type ActualizarDatoUtilInput = z.infer<typeof actualizarDatoUtilSchema>;
