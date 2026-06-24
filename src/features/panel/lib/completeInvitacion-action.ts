"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const completeInvitacionSchema = z.object({
  hospedaje_id: z.string().uuid(),
  responsable_nombre: z.string().min(3, "Nombre requerido").max(120),
  responsable_email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  // Datos del hospedaje
  slug: z
    .string()
    .min(3, "Slug muy corto")
    .max(80, "Slug muy largo")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones"),
  nombre: z.string().min(3, "Mínimo 3 caracteres").max(120),
  tipo: z.enum(["hotel", "apart", "cabana", "hosteria", "camping", "casa", "departamento"]),
  descripcion_corta: z.string().min(20, "Mínimo 20 caracteres").max(200),
  descripcion_larga: z.string().max(5000).optional().or(z.literal("").transform(() => undefined)),
  direccion: z.string().min(5, "Dirección requerida").max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  responsable_whatsapp: z.string().regex(/^\+\d{10,15}$/, "WhatsApp inválido"),
});

export interface CompleteInvitacionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function completeInvitacionAction(
  formData: FormData
): Promise<CompleteInvitacionResult> {
  let input;
  try {
    const data = Object.fromEntries(formData);
    input = completeInvitacionSchema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".");
        fieldErrors[key] ??= issue.message;
      }
      return { error: "Hay errores en el formulario.", fieldErrors };
    }
    return { error: "Error inesperado al parsear el formulario." };
  }

  const supabase = createAdminClient();

  // 1. Crear usuario en auth.users
  const authUserResult = await supabase.auth.admin.createUser({
    email: input.responsable_email,
    password: input.password,
    email_confirm: true, // Auto-confirmar el email
  });

  let userId: string;

  if (authUserResult.error || !authUserResult.data?.user) {
    console.error("[completeInvitacion] auth.admin.createUser error:", authUserResult.error);
    // Si el error es "User already exists", es ok (probablemente fue creado en otro intento)
    if (authUserResult.error?.message?.includes("already exists")) {
      // Continuar con el usuario existente
      const existingUser = await supabase.auth.admin.getUserById(input.responsable_email);
      if (!existingUser.data?.user) {
        return { error: "Error al obtener usuario existente." };
      }
      userId = existingUser.data.user.id;
    } else {
      return { error: authUserResult.error?.message ?? "Error al crear usuario." };
    }
  } else {
    userId = authUserResult.data.user.id;
  }

  // 2. Crear perfil en perfiles (si no existe)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perfilInsertResult = await (supabase.from("perfiles") as any).insert({
    id: userId,
    nombre: input.responsable_nombre,
    rol: "responsable",
    hospedajes_ids: [input.hospedaje_id], // Auto-linkear
  });

  const perfilError = perfilInsertResult.error;

  if (perfilError && !perfilError.message?.includes("duplicate")) {
    console.error("[completeInvitacion] perfiles insert error:", perfilError);
    return { error: "Error al crear perfil." };
  }

  // Si el perfil ya existe, actualizar hospedajes_ids
  if (perfilError?.message?.includes("duplicate")) {
    const result = await supabase
      .from("perfiles")
      .select("hospedajes_ids")
      .eq("id", userId)
      .single();

    const existingPerfil = result.data as { hospedajes_ids: string[] } | null;
    const hospedajeIds = existingPerfil?.hospedajes_ids ?? [];
    if (!hospedajeIds.includes(input.hospedaje_id)) {
      hospedajeIds.push(input.hospedaje_id);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("perfiles") as any)
      .update({ hospedajes_ids: hospedajeIds })
      .eq("id", userId);
  }

  // 3. Actualizar hospedaje con datos completados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateResult = await (supabase.from("hospedajes") as any).update({
    slug: input.slug,
    nombre: input.nombre,
    tipo: input.tipo,
    descripcion_corta: input.descripcion_corta,
    descripcion_larga: input.descripcion_larga,
    direccion: input.direccion,
    lat: input.lat,
    lng: input.lng,
    responsable_nombre: input.responsable_nombre,
    responsable_email: input.responsable_email,
    responsable_whatsapp: input.responsable_whatsapp,
    whatsapp: input.responsable_whatsapp,
  }).eq("id", input.hospedaje_id);

  const updateError = updateResult.error;

  if (updateError) {
    console.error("[completeInvitacion] hospedaje update error:", updateError);
    if (updateError.code === "23505") {
      return {
        error: "Ya existe un hospedaje con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: updateError.message ?? "Error al actualizar hospedaje." };
  }

  // 4. Redirigir a login para que ingrese
  redirect("/login");
}
