"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { DestinoRow } from "@/types/database";

export interface DestinoListRow {
  id: string;
  slug: string;
  nombre: string;
  region: string | null;
  provincia: string | null;
  pais: string | null;
  activo: boolean;
  restricciones_habilitadas: boolean;
  orden: number;
  hospedajesCount: number;
}

/**
 * Lista todos los destinos con conteo de hospedajes. Visible a cualquier
 * admin (super o local) — RLS permite SELECT abierto sobre destinos via
 * "Destinos: admin lectura total".
 */
export async function listDestinosAdmin(): Promise<DestinoListRow[]> {
  await requireAdmin();
  const sb = createAdminClient();

  const { data: destinos } = await sb
    .from("destinos")
    .select(
      "id, slug, nombre, region, provincia, pais, activo, restricciones_habilitadas, orden"
    )
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true })
    .returns<
      Array<{
        id: string;
        slug: string;
        nombre: string;
        region: string | null;
        provincia: string | null;
        pais: string | null;
        activo: boolean;
        restricciones_habilitadas: boolean;
        orden: number;
      }>
    >();
  if (!destinos) return [];

  // Contar hospedajes por destino. Una sola query agregada.
  const { data: counts } = await sb
    .from("hospedajes")
    .select("destino_id")
    .returns<Array<{ destino_id: string }>>();
  const countByDestino = new Map<string, number>();
  for (const h of counts ?? []) {
    countByDestino.set(h.destino_id, (countByDestino.get(h.destino_id) ?? 0) + 1);
  }

  return destinos.map((d) => ({
    ...d,
    hospedajesCount: countByDestino.get(d.id) ?? 0,
  }));
}

export async function getDestino(id: string): Promise<DestinoRow | null> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("destinos")
    .select("*")
    .eq("id", id)
    .maybeSingle<DestinoRow>();
  return data;
}

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const destinoSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug muy corto")
    .max(60, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones (ej. mar-azul)"),
  nombre: z.string().trim().min(2, "Nombre requerido").max(120),
  // `region_id` es el vínculo real con la tabla `regiones` (agrupa el destino en
  // el hub y su página). `region` (texto) queda como label legacy y se sincroniza
  // server-side desde la región elegida — ver resolveRegionLabel.
  region_id: z.string().uuid().optional().nullable(),
  // Ciudad: nivel intermedio opcional (agrupa destinos cercanos dentro de la
  // región, ej. Villa Gesell). El form la filtra por la región elegida.
  ciudad_id: z.string().uuid().optional().nullable(),
  region: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  provincia: z
    .string()
    .trim()
    .max(120)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pais: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  descripcion_corta: z
    .string()
    .trim()
    .max(280)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  descripcion_larga: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lat: z
    .union([z.coerce.number().min(-90).max(90), z.literal("").transform(() => null)])
    .nullable()
    .optional(),
  lng: z
    .union([z.coerce.number().min(-180).max(180), z.literal("").transform(() => null)])
    .nullable()
    .optional(),
  foto_path: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => null)),
  activo: z.coerce.boolean().default(true),
  restricciones_habilitadas: z.coerce.boolean().default(false),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
});

export type DestinoInput = z.infer<typeof destinoSchema>;

function parseFormData(formData: FormData): unknown {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "activo" || k === "restricciones_habilitadas") {
      raw[k] = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // skip empty strings to avoid coercion issues
    } else {
      raw[k] = v;
    }
  }
  // Los checkbox no aparecen en FormData si no están marcados.
  if (!("activo" in raw)) raw.activo = false;
  if (!("restricciones_habilitadas" in raw)) raw.restricciones_habilitadas = false;
  return raw;
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

/**
 * Construye el payload a persistir resolviendo la relación con la región: si se
 * eligió una región, sincroniza el label legacy `region` (texto) con su nombre;
 * si no, deja `region_id` en null (y no toca el texto legacy para no perderlo).
 */
async function buildDestinoPayload(
  sb: ReturnType<typeof createAdminClient>,
  data: DestinoInput
): Promise<Record<string, unknown>> {
  const payload: Record<string, unknown> = { ...data };
  if (data.region_id) {
    const { data: reg } = await sb
      .from("regiones")
      .select("nombre")
      .eq("id", data.region_id)
      .maybeSingle<{ nombre: string }>();
    if (reg) payload.region = reg.nombre;
  } else {
    payload.region_id = null;
  }
  // Ciudad: opcional. Siempre seteamos explícito (null si no se eligió) para
  // que al desvincularla en una edición quede en null, no sin tocar.
  payload.ciudad_id = data.ciudad_id ?? null;
  return payload;
}

export async function createDestinoAction(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede crear destinos." };
  }

  const parsed = destinoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const payload = await buildDestinoPayload(sb, parsed.data);
  const { data, error } = await sb
    .from("destinos")
    .insert(payload as never)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe un destino con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/destinos");
  revalidatePath("/");
  redirect(`/admin/destinos/${data.id}`);
}

export async function updateDestinoAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede editar destinos." };
  }

  const parsed = destinoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const payload = await buildDestinoPayload(sb, parsed.data);
  const { error } = await sb
    .from("destinos")
    .update(payload as never)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otro destino con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/destinos");
  revalidatePath(`/admin/destinos/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Atajo para toggle activo desde el listado, sin abrir el form completo.
 * Solo super admin.
 */
export async function toggleDestinoActivoAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede activar/desactivar destinos." };
  }
  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("destinos")
    .select("activo")
    .eq("id", id)
    .maybeSingle<{ activo: boolean }>();
  if (!actual) return { error: "Destino no encontrado." };

  const { error } = await sb
    .from("destinos")
    .update({ activo: !actual.activo } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/destinos");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Toggle del feature-flag `restricciones_habilitadas` desde el listado.
 * A diferencia del resto de las mutaciones de destino (super admin only),
 * acá el **admin local del destino** también puede prender/apagar las
 * restricciones de SU destino. Super admin puede sobre cualquiera.
 */
export async function toggleRestriccionesHabilitadasAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin && me.destinoId !== id) {
    return {
      error:
        "Solo el super admin o el admin local de este destino puede cambiar las restricciones.",
    };
  }

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("destinos")
    .select("restricciones_habilitadas")
    .eq("id", id)
    .maybeSingle<{ restricciones_habilitadas: boolean }>();
  if (!actual) return { error: "Destino no encontrado." };

  const { error } = await sb
    .from("destinos")
    .update({ restricciones_habilitadas: !actual.restricciones_habilitadas } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/destinos");
  return { ok: true };
}

/**
 * Borra un destino. Falla si tiene hospedajes (FK destinos sin on delete
 * cascade). En ese caso el admin debe primero borrar/migrar los hospedajes
 * o marcar el destino como inactivo en vez de borrarlo.
 */
export async function deleteDestinoAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar destinos." };
  }

  const sb = createAdminClient();
  const { count } = await sb
    .from("hospedajes")
    .select("id", { count: "exact", head: true })
    .eq("destino_id", id);
  if ((count ?? 0) > 0) {
    return {
      error: `No se puede borrar: el destino tiene ${count} hospedaje${
        count === 1 ? "" : "s"
      } asociado${count === 1 ? "" : "s"}. Migralos a otro destino o marcalo como inactivo.`,
    };
  }

  // Borrar la foto del bucket si tenía una cargada.
  const { data: actual } = await sb
    .from("destinos")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (actual?.foto_path) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  const { error } = await sb.from("destinos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/destinos");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Persiste el `foto_path` después de un upload exitoso al bucket
 * `destinos`. Si había una foto previa, borra el objeto viejo del bucket
 * (no nos quedamos con huérfanos).
 */
export async function setDestinoFotoAction(
  id: string,
  fotoPath: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede modificar la foto del destino." };
  }
  if (!fotoPath || fotoPath.length > 500) {
    return { error: "Path inválido." };
  }

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("destinos")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Destino no encontrado." };

  const { error } = await sb
    .from("destinos")
    .update({ foto_path: fotoPath } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (actual.foto_path && actual.foto_path !== fotoPath) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  revalidatePath("/admin/destinos");
  revalidatePath(`/admin/destinos/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** Borra la foto del destino (objeto en bucket + limpia la columna). */
export async function deleteDestinoFotoAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar la foto del destino." };
  }

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("destinos")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Destino no encontrado." };
  if (!actual.foto_path) return { ok: true };

  await sb.storage.from("destinos").remove([actual.foto_path]);

  const { error } = await sb
    .from("destinos")
    .update({ foto_path: null } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/destinos");
  revalidatePath(`/admin/destinos/${id}`);
  revalidatePath("/");
  return { ok: true };
}
