"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import { requireResponsable } from "@/features/panel/lib/auth";
import {
  assertAdminCanAccessDestino,
} from "@/features/admin/lib/scope";
import {
  lugarSchema,
  parseFormDataToLugar,
} from "@/features/lugares/lib/validation";
import { assertResponsableOwnsLugar } from "@/features/lugares/lib/auth";
import {
  notifyLugarPublicado,
  notifyLugarRechazado,
} from "@/features/lugares/lib/notifications";
import type { EstadoLugar, LugarRow } from "@/types/database";

export interface ActionResult {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
  id?: string;
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

async function assertAdminCanAccessLugar(
  adminDestinoId: string | null,
  isSuperAdmin: boolean,
  lugarId: string
): Promise<{ destinoId: string; tipo: string; estado: EstadoLugar }> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("lugares")
    .select("destino_id, tipo, estado")
    .eq("id", lugarId)
    .maybeSingle<{
      destino_id: string;
      tipo: string;
      estado: EstadoLugar;
    }>();
  if (!data) throw new Error("Lugar no encontrado.");
  if (!isSuperAdmin && data.destino_id !== adminDestinoId) {
    throw new Error("No tenés permiso para gestionar este lugar.");
  }
  return { destinoId: data.destino_id, tipo: data.tipo, estado: data.estado };
}

// =============================================================================
// CREATE
// =============================================================================

/**
 * Admin crea un lugar (cualquier tipo). Si es atractivo, va directo a
 * `borrador` y el admin lo publica desde la UI. Para gastronómico cargado
 * por admin, idem (no requiere "validación" — la validación es para flows
 * donde un externo carga).
 */
export async function createLugarAsAdminAction(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const raw = parseFormDataToLugar(formData);
  const parsed = lugarSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);
  let input = parsed.data;

  if (!admin.isSuperAdmin) {
    input = { ...input, destino_id: admin.destinoId! };
  }
  try {
    assertAdminCanAccessDestino(admin, input.destino_id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("lugares")
    .insert({ ...input, estado: "borrador" } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un lugar con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/lugares");
  return { ok: true, id: data.id };
}

/**
 * Responsable crea un gastronómico. Va directo a `pendiente_validacion`
 * (el admin local revisa antes de publicar). Crea automáticamente la fila
 * en `responsabilidades` para que el responsable quede como dueño.
 */
export async function createLugarAsResponsableAction(
  formData: FormData
): Promise<ActionResult> {
  const responsable = await requireResponsable();
  if (responsable.perfil.rol !== "responsable") {
    return { error: "Solo responsables pueden cargar gastronómicos." };
  }

  const raw = parseFormDataToLugar(formData);
  const parsed = lugarSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);
  const input = parsed.data;

  if (input.tipo !== "gastronomico") {
    return { error: "Los responsables solo cargan gastronómicos." };
  }

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("lugares")
    .insert({ ...input, estado: "pendiente_validacion" } as never)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un gastronómico con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  // Auto-asignar responsabilidad. Si falla, hay que rollback al insert
  // anterior — porque si no, queda huérfano y RLS le bloquea editarlo.
  const { error: respError } = await sb
    .from("responsabilidades")
    .insert({
      perfil_id: responsable.id,
      entidad_tipo: "lugar",
      entidad_id: data.id,
    } as never);

  if (respError) {
    await sb.from("lugares").delete().eq("id", data.id);
    console.error("[createLugarAsResponsable] responsabilidad insert error:", respError);
    return { error: "No pudimos asignar la responsabilidad. Probá de nuevo." };
  }

  revalidatePath("/panel/lugares");
  return { ok: true, id: data.id };
}

// =============================================================================
// UPDATE
// =============================================================================

export async function updateLugarAsAdminAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();

  let ctx;
  try {
    ctx = await assertAdminCanAccessLugar(
      admin.destinoId,
      admin.isSuperAdmin,
      id
    );
  } catch (e) {
    return { error: (e as Error).message };
  }

  const raw = parseFormDataToLugar(formData);
  const parsed = lugarSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);
  const input = parsed.data;

  if (!admin.isSuperAdmin && input.destino_id !== admin.destinoId) {
    return { error: "No podés mover el lugar a otro destino." };
  }
  if (input.tipo !== ctx.tipo) {
    return { error: "No se puede cambiar el tipo de un lugar existente." };
  }

  const sb = createAdminClient();

  // Estado previo para detectar transición a publicado desde el editor.
  const { data: previo } = await sb
    .from("lugares")
    .select("estado")
    .eq("id", id)
    .maybeSingle<{ estado: EstadoLugar }>();
  const estadoAnterior = previo?.estado ?? null;

  const { error } = await sb
    .from("lugares")
    .update(input as never)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un lugar con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  // Si el editor cambió el estado a publicado, notificamos.
  // (El campo `estado` no viene del schema porque lo controlamos por aparte;
  // pero si en el futuro se incluye, la transición queda cubierta.)
  const nuevoEstado = (input as { estado?: EstadoLugar }).estado;
  if (nuevoEstado === "publicado" && estadoAnterior !== "publicado") {
    await notifyLugarPublicado(id);
  }

  revalidatePath("/admin/lugares");
  revalidatePath(`/admin/lugares/${id}`);
  return { ok: true };
}

/**
 * Responsable edita su gastronómico. Cualquier edición DESPUÉS de la
 * publicación lo manda a `pendiente_validacion` para que el admin re-valide.
 * Es la misma lógica que aplicamos a hospedajes — el responsable no puede
 * cambiar campos críticos sin revisión.
 */
export async function updateLugarAsResponsableAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const responsable = await requireResponsable();
  if (responsable.perfil.rol !== "responsable") {
    return { error: "Acceso denegado." };
  }
  try {
    await assertResponsableOwnsLugar(responsable, id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const raw = parseFormDataToLugar(formData);
  const parsed = lugarSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);
  const input = parsed.data;

  if (input.tipo !== "gastronomico") {
    return { error: "No se puede cambiar el tipo." };
  }

  const sb = createAdminClient();

  const { data: previo } = await sb
    .from("lugares")
    .select("estado")
    .eq("id", id)
    .maybeSingle<{ estado: EstadoLugar }>();

  const nuevoEstado: EstadoLugar =
    previo?.estado === "publicado" ? "pendiente_validacion" : previo?.estado ?? "borrador";

  const { error } = await sb
    .from("lugares")
    .update({ ...input, estado: nuevoEstado } as never)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un gastronómico con ese slug en este destino.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/panel/lugares");
  revalidatePath(`/panel/lugares/${id}`);
  return { ok: true };
}

// =============================================================================
// TRANSICIONES DE ESTADO
// =============================================================================

const changeEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: z.enum([
    "borrador",
    "pendiente_validacion",
    "publicado",
    "pausado",
    "rechazado",
  ]),
  notas: z.string().max(500).optional(),
});

/**
 * Solo admin. Mueve un lugar a cualquier estado. Sobre publicación se
 * registra `validado_at` y `validado_por`. Notifica al responsable
 * (si existe y tipo=gastronomico) en transiciones a publicado o rechazado.
 */
export async function changeEstadoLugarAction(input: {
  id: string;
  estado: EstadoLugar;
  notas?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = changeEstadoSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await assertAdminCanAccessLugar(admin.destinoId, admin.isSuperAdmin, parsed.data.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  // Estado previo para detectar transiciones reales.
  const { data: previo } = await sb
    .from("lugares")
    .select("estado")
    .eq("id", parsed.data.id)
    .maybeSingle<{ estado: EstadoLugar }>();
  const estadoAnterior = previo?.estado ?? null;

  const payload: Partial<LugarRow> = { estado: parsed.data.estado };
  if (parsed.data.estado === "publicado") {
    payload.validado_at = new Date().toISOString();
    payload.validado_por = admin.id;
  }

  const { error } = await sb
    .from("lugares")
    .update(payload as never)
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  if (
    parsed.data.estado === "publicado" &&
    estadoAnterior !== "publicado"
  ) {
    await notifyLugarPublicado(parsed.data.id);
  } else if (
    parsed.data.estado === "rechazado" &&
    estadoAnterior !== "rechazado"
  ) {
    await notifyLugarRechazado(
      parsed.data.id,
      parsed.data.notas || "Tu local necesita ajustes antes de publicarse."
    );
  }

  revalidatePath("/admin/lugares");
  revalidatePath(`/admin/lugares/${parsed.data.id}`);
  return { ok: true };
}

/**
 * Responsable envía su gastronómico a validación (de `borrador` a
 * `pendiente_validacion`). Trigger manual desde el panel responsable.
 */
export async function submitLugarForValidationAction(
  id: string
): Promise<ActionResult> {
  const responsable = await requireResponsable();
  if (responsable.perfil.rol !== "responsable") {
    return { error: "Acceso denegado." };
  }
  try {
    await assertResponsableOwnsLugar(responsable, id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("lugares")
    .update({ estado: "pendiente_validacion" } as never)
    .eq("id", id)
    .in("estado", ["borrador", "rechazado"]);

  if (error) return { error: error.message };

  revalidatePath("/panel/lugares");
  revalidatePath(`/panel/lugares/${id}`);
  return { ok: true };
}

// =============================================================================
// DELETE
// =============================================================================

/**
 * Solo admin. Elimina el lugar y por cascade sus fotos y responsabilidades
 * asociadas.
 */
export async function deleteLugarAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await assertAdminCanAccessLugar(admin.destinoId, admin.isSuperAdmin, id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();

  // Borrar responsabilidades primero (FK no tiene ON DELETE CASCADE hacia
  // lugares — apunta a perfiles). Igual hay que limpiarlas a mano.
  await sb
    .from("responsabilidades")
    .delete()
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", id);

  const { error } = await sb.from("lugares").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/lugares");
  redirect("/admin/lugares");
}

// =============================================================================
// ASIGNAR RESPONSABILIDAD (admin)
// =============================================================================

const assignSchema = z.object({
  lugarId: z.string().uuid(),
  perfilId: z.string().uuid(),
});

/**
 * Admin asigna un responsable existente a un lugar gastronómico. Para flow
 * de transferencia de propiedad o cuando el dueño se registra después de
 * que el admin ya cargó el local.
 */
export async function assignResponsableToLugarAction(input: {
  lugarId: string;
  perfilId: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  let ctx;
  try {
    ctx = await assertAdminCanAccessLugar(
      admin.destinoId,
      admin.isSuperAdmin,
      parsed.data.lugarId
    );
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (ctx.tipo !== "gastronomico") {
    return {
      error: "Solo los gastronómicos pueden tener responsable. Los atractivos los gestiona el admin.",
    };
  }

  const sb = createAdminClient();

  // Verificar que el perfil exista y sea responsable.
  const { data: perfil } = await sb
    .from("perfiles")
    .select("rol")
    .eq("id", parsed.data.perfilId)
    .maybeSingle<{ rol: string }>();

  if (!perfil) return { error: "Perfil no encontrado." };
  if (perfil.rol !== "responsable") {
    return { error: "El perfil seleccionado no es responsable." };
  }

  const { error } = await sb
    .from("responsabilidades")
    .insert({
      perfil_id: parsed.data.perfilId,
      entidad_tipo: "lugar",
      entidad_id: parsed.data.lugarId,
    } as never);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese responsable ya está asignado a este lugar." };
    }
    return { error: error.message };
  }

  revalidatePath(`/admin/lugares/${parsed.data.lugarId}`);
  return { ok: true };
}

/**
 * Quitar responsabilidad. Para reasignación o si el responsable deja el local.
 */
export async function removeResponsableFromLugarAction(input: {
  lugarId: string;
  perfilId: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  try {
    await assertAdminCanAccessLugar(
      admin.destinoId,
      admin.isSuperAdmin,
      parsed.data.lugarId
    );
  } catch (e) {
    return { error: (e as Error).message };
  }

  const sb = createAdminClient();
  const { error } = await sb
    .from("responsabilidades")
    .delete()
    .eq("perfil_id", parsed.data.perfilId)
    .eq("entidad_tipo", "lugar")
    .eq("entidad_id", parsed.data.lugarId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/lugares/${parsed.data.lugarId}`);
  return { ok: true };
}
