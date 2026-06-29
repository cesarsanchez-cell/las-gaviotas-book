import { z } from "zod";

export const crearDatoUtilSchema = z.object({
  rubroId: z.string().uuid("Rubro inválido"),
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  direccion: z.string().max(200).nullable().optional(),
  contacto: z.string().max(100).nullable().optional(),
});

export const actualizarDatoUtilSchema = crearDatoUtilSchema;

export type CrearDatoUtilInput = z.infer<typeof crearDatoUtilSchema>;
export type ActualizarDatoUtilInput = z.infer<typeof actualizarDatoUtilSchema>;
