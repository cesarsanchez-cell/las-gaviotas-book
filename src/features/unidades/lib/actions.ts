"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentResponsable } from "@/features/panel/lib/auth";
import {
  parseFormDataToUnidadType,
  parseFormDataToUnidad,
  createMultiplesUnidadesSchema,
  type UnidadTypeInput,
  type UnidadInput,
} from "@/features/unidades/lib/validation";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

// =============================================================================
// Helpers internos de scope
// =============================================================================
// Mismo principio que disponibilidad: el responsable es el único que carga su
// inventario. El admin solo lee (RLS). Si en el futuro un admin necesita
// editar (ej. para arreglar un error de carga), se decide explícitamente.

interface AccessContext {
  userId: string;
  hospedajeId: string;
}

async function requireResponsableOwnsHospedaje(
  hospedajeId: string
): Promise<AccessContext> {
  const responsable = await getCurrentResponsable();
  if (!responsable) {
    throw new Error(
      "Solo el responsable del hospedaje puede modificar las unidades."
    );
  }
  if (!responsable.hospedajeIds.includes(hospedajeId)) {
    throw new Error("Sin permisos sobre este hospedaje.");
  }
  return { userId: responsable.id, hospedajeId };
}

async function requireResponsableOwnsUnidadType(
  unidadTypeId: string
): Promise<AccessContext> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("unidad_types")
    .select("hospedaje_id")
    .eq("id", unidadTypeId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!data) throw new Error("Tipo de unidad inexistente.");
  return requireResponsableOwnsHospedaje(data.hospedaje_id);
}

async function requireResponsableOwnsUnidad(
  unidadId: string
): Promise<AccessContext> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("unidades")
    .select("hospedaje_id")
    .eq("id", unidadId)
    .maybeSingle<{ hospedaje_id: string }>();
  if (!data) throw new Error("Unidad inexistente.");
  return requireResponsableOwnsHospedaje(data.hospedaje_id);
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  // Log server-side para diagnóstico durante 2.B — sacar después.
  console.error("[unidades] zod error:", JSON.stringify(err.issues, null, 2));
  return { error: "Hay errores en el formulario.", fieldErrors };
}

function revalidateUnidades(hospedajeId: string) {
  revalidatePath(`/panel/hospedajes/${hospedajeId}/unidades`);
  revalidatePath(`/panel/hospedajes/${hospedajeId}`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}/unidades`);
  revalidatePath(`/admin/hospedajes/${hospedajeId}`);
  // Página pública del hospedaje: sección "Unidades" depende de esto.
  // No conocemos el slug acá, así que invalidamos las dos rutas plurales —
  // /[destino]/hospedajes lista cards y /[destino]/hospedajes/[slug] el detalle.
  // El cache de Next va a recalcular cuando alguien navegue.
}

// =============================================================================
// CRUD de unidad_types
// =============================================================================

export async function createUnidadTypeAction(
  formData: FormData
): Promise<ActionResult> {
  // Atajo opcional: si el responsable marcó "crear también la primera unidad
  // ahora" en el alta, leemos y removemos esos campos del FormData antes de
  // parsear el schema del tipo (que no los conoce).
  const crearUnidad =
    formData.get("crear_unidad") === "on" ||
    formData.get("crear_unidad") === "true";
  const primeraUnidadNombre = String(
    formData.get("primera_unidad_nombre") ?? ""
  ).trim();
  formData.delete("crear_unidad");
  formData.delete("primera_unidad_nombre");

  let input: UnidadTypeInput;
  try {
    input = parseFormDataToUnidadType(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "No pude procesar el formulario." };
  }

  try {
    await requireResponsableOwnsHospedaje(input.hospedaje_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Validación del atajo: si pidió crear unidad, el nombre es obligatorio.
  if (crearUnidad && primeraUnidadNombre.length === 0) {
    return {
      error: "Hay errores en el formulario.",
      fieldErrors: {
        primera_unidad_nombre:
          "Poné un nombre para la primera unidad o destildá el atajo.",
      },
    };
  }
  if (crearUnidad && primeraUnidadNombre.length > 60) {
    return {
      error: "Hay errores en el formulario.",
      fieldErrors: {
        primera_unidad_nombre: "Máximo 60 caracteres.",
      },
    };
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("unidad_types")
    .insert({
      hospedaje_id: input.hospedaje_id,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      capacidad_adultos: input.capacidad_adultos,
      capacidad_ninos: input.capacidad_ninos,
      camas_descripcion: input.camas_descripcion ?? null,
      amenities: input.amenities,
      vista: input.vista ?? null,
      calefaccion_tipo: input.calefaccion_tipo ?? null,
      activo: input.activo,
      orden: input.orden,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return { error: error?.message ?? "No se pudo crear." };

  // Atajo: crear la primera unidad física en la misma operación.
  // Si esto falla, el tipo igual queda creado — el responsable la podrá crear
  // manualmente desde la página de edición. Lo logueamos para diagnóstico.
  if (crearUnidad) {
    const { error: errUnidad } = await sb.from("unidades").insert({
      unidad_type_id: data.id,
      hospedaje_id: input.hospedaje_id,
      nombre: primeraUnidadNombre,
      activa: true,
      orden: 1,
    } as never);
    if (errUnidad) {
      console.error("[unidades] error creando primera unidad:", errUnidad);
    }
  }

  revalidateUnidades(input.hospedaje_id);
  return {
    ok: true,
    redirectTo: `/panel/hospedajes/${input.hospedaje_id}/unidades/${data.id}`,
  };
}

export async function updateUnidadTypeAction(
  unidadTypeId: string,
  formData: FormData
): Promise<ActionResult> {
  let input: UnidadTypeInput;
  try {
    input = parseFormDataToUnidadType(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "No pude procesar el formulario." };
  }

  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidadType(unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  // No permitimos cambiar el hospedaje_id de un unidad_type — el trigger de
  // consistencia con unidades lo impediría igual, pero rechazamos antes.
  if (input.hospedaje_id !== ctx.hospedajeId) {
    return { error: "No podés mover una unidad a otro hospedaje." };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("unidad_types")
    .update({
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      capacidad_adultos: input.capacidad_adultos,
      capacidad_ninos: input.capacidad_ninos,
      camas_descripcion: input.camas_descripcion ?? null,
      amenities: input.amenities,
      vista: input.vista ?? null,
      calefaccion_tipo: input.calefaccion_tipo ?? null,
      activo: input.activo,
      orden: input.orden,
    } as never)
    .eq("id", unidadTypeId);

  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

export async function toggleUnidadTypeActivoAction(
  unidadTypeId: string
): Promise<ActionResult> {
  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidadType(unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { data: current } = await sb
    .from("unidad_types")
    .select("activo")
    .eq("id", unidadTypeId)
    .maybeSingle<{ activo: boolean }>();
  if (!current) return { error: "Tipo de unidad inexistente." };

  const { error } = await sb
    .from("unidad_types")
    .update({ activo: !current.activo } as never)
    .eq("id", unidadTypeId);
  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

export async function deleteUnidadTypeAction(
  unidadTypeId: string
): Promise<ActionResult> {
  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidadType(unidadTypeId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  // Cascade en BD borra unidades, fotos, disponibilidad, tarifas, restricciones.
  // Esto es destructivo: el caller (UI) debe confirmar antes.
  const { error } = await sb
    .from("unidad_types")
    .delete()
    .eq("id", unidadTypeId);
  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true, redirectTo: `/panel/hospedajes/${ctx.hospedajeId}/unidades` };
}

// =============================================================================
// CRUD de unidades físicas
// =============================================================================

export async function createUnidadAction(
  formData: FormData
): Promise<ActionResult> {
  let input: UnidadInput;
  try {
    input = parseFormDataToUnidad(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "No pude procesar el formulario." };
  }

  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidadType(input.unidad_type_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb.from("unidades").insert({
    unidad_type_id: input.unidad_type_id,
    hospedaje_id: ctx.hospedajeId,
    nombre: input.nombre,
    activa: input.activa,
    notas_internas: input.notas_internas ?? null,
    orden: input.orden,
  } as never);

  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

/**
 * Alta múltiple: dado un `unidad_type` ya creado, instancia N unidades físicas
 * de una vez ("Dúplex 1", "Dúplex 2", ...). Usa el nombre del tipo como
 * prefijo si no se pasa uno explícito. Si una numeración ya está usada, agrega
 * sufijo (-bis, -ter) para evitar duplicados visuales (no unique en BD, son
 * solo etiquetas).
 */
export async function createMultiplesUnidadesAction(input: {
  unidad_type_id: string;
  cantidad: number;
  prefijo?: string;
  inicio_numeracion?: number;
}): Promise<ActionResult> {
  const parsed = createMultiplesUnidadesSchema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error instanceof z.ZodError) return formatZodError(parsed.error);
    return { error: "Datos inválidos." };
  }

  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidadType(parsed.data.unidad_type_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  // Si no se pasó prefijo, usar el nombre del unidad_type como base.
  let prefijo = parsed.data.prefijo;
  if (!prefijo) {
    const { data: ut } = await sb
      .from("unidad_types")
      .select("nombre")
      .eq("id", parsed.data.unidad_type_id)
      .maybeSingle<{ nombre: string }>();
    prefijo = ut?.nombre ?? "Unidad";
  }

  const inicio = parsed.data.inicio_numeracion;
  const rows = Array.from({ length: parsed.data.cantidad }, (_, i) => ({
    unidad_type_id: parsed.data.unidad_type_id,
    hospedaje_id: ctx.hospedajeId,
    nombre: `${prefijo} ${inicio + i}`,
    activa: true,
    orden: inicio + i,
  }));

  const { error } = await sb.from("unidades").insert(rows as never);
  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

export async function updateUnidadAction(
  unidadId: string,
  formData: FormData
): Promise<ActionResult> {
  let input: UnidadInput;
  try {
    input = parseFormDataToUnidad(formData);
  } catch (err) {
    if (err instanceof z.ZodError) return formatZodError(err);
    return { error: "No pude procesar el formulario." };
  }

  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidad(unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  // No permitimos cambiar de unidad_type_id (movería la unidad a otro tipo,
  // arrastraría su calendario, complicaría tarifas). Decisión: si querés
  // recategorizar una unidad, borrala y creá una nueva.
  const { error } = await sb
    .from("unidades")
    .update({
      nombre: input.nombre,
      activa: input.activa,
      notas_internas: input.notas_internas ?? null,
      orden: input.orden,
    } as never)
    .eq("id", unidadId);

  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

export async function toggleUnidadActivaAction(
  unidadId: string
): Promise<ActionResult> {
  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidad(unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { data: current } = await sb
    .from("unidades")
    .select("activa")
    .eq("id", unidadId)
    .maybeSingle<{ activa: boolean }>();
  if (!current) return { error: "Unidad inexistente." };

  const { error } = await sb
    .from("unidades")
    .update({ activa: !current.activa } as never)
    .eq("id", unidadId);
  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}

export async function deleteUnidadAction(
  unidadId: string
): Promise<ActionResult> {
  let ctx: AccessContext;
  try {
    ctx = await requireResponsableOwnsUnidad(unidadId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  // Cascade borra disponibilidad de esa unidad. El responsable es responsable
  // de saber lo que está haciendo — la UI debe confirmar antes.
  const { error } = await sb.from("unidades").delete().eq("id", unidadId);
  if (error) return { error: error.message };

  revalidateUnidades(ctx.hospedajeId);
  return { ok: true };
}
