"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { RegionRow, Bioma } from "@/types/database";

export interface RegionListRow {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  biomas: Bioma[];
  activo: boolean;
  destacado: boolean;
  orden: number;
  destinosCount: number;
}

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const biomaSchema = z.enum([
  "playa",
  "bosque",
  "montana",
  "sierra",
  "lago",
  "desierto",
]);

const regionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug muy corto")
    .max(60, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().trim().min(3, "Nombre muy corto").max(80),
  descripcion: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  biomas: z
    .array(biomaSchema)
    .min(1, "Elegí al menos un bioma")
    .max(3, "Máximo 3 biomas"),
  pais: z.string().trim().max(60).default("Argentina"),
  activo: z.coerce.boolean().default(true),
  destacado: z.coerce.boolean().default(false),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
  foto_path: z
    .string()
    .trim()
    .max(400)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type RegionInput = z.infer<typeof regionSchema>;

/**
 * Lista todas las regiones con conteo de destinos. Solo super admin escribe,
 * pero cualquier admin puede ver el listado.
 */
export async function listRegionesAdmin(): Promise<RegionListRow[]> {
  await requireAdmin();
  const sb = createAdminClient();

  const { data: regiones } = await sb
    .from("regiones")
    .select("*")
    .order("orden", { ascending: true })
    .returns<RegionRow[]>();
  if (!regiones) return [];

  const { data: counts } = (await sb
    .from("destinos")
    .select("region_id")
    .not("region_id", "is", null)) as {
    data: Array<{ region_id: string | null }> | null;
  };

  const countByRegion = new Map<string, number>();
  for (const d of counts ?? []) {
    if (!d.region_id) continue;
    countByRegion.set(d.region_id, (countByRegion.get(d.region_id) ?? 0) + 1);
  }

  return regiones.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    biomas: r.biomas,
    activo: r.activo,
    destacado: r.destacado,
    orden: r.orden,
    destinosCount: countByRegion.get(r.id) ?? 0,
  }));
}

export async function getRegion(id: string): Promise<RegionRow | null> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("regiones")
    .select("*")
    .eq("id", id)
    .maybeSingle<RegionRow>();
  return data;
}

function parseFormData(formData: FormData): unknown {
  const raw: Record<string, unknown> = {};
  const biomas: string[] = [];
  for (const [k, v] of formData.entries()) {
    if (k === "activo" || k === "destacado") {
      raw[k] = v === "on" || v === "true";
    } else if (k === "biomas") {
      // Checkboxes multiples — vienen como pares (biomas, value).
      if (typeof v === "string" && v) biomas.push(v);
    } else if (typeof v === "string" && v.trim() === "") {
      // skip empty
    } else {
      raw[k] = v;
    }
  }
  if (!("activo" in raw)) raw.activo = false;
  if (!("destacado" in raw)) raw.destacado = false;
  raw.biomas = biomas;
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

export async function createRegionAction(
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede crear regiones." };
  }

  const parsed = regionSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("regiones")
    .insert(parsed.data as never)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe una región con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/regiones");
  revalidatePath("/");
  redirect(`/admin/regiones/${data.id}`);
}

export async function updateRegionAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede editar regiones." };
  }

  const parsed = regionSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { error } = await sb
    .from("regiones")
    .update(parsed.data as never)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otra región con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/regiones");
  revalidatePath(`/admin/regiones/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleRegionActivaAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede activar/desactivar regiones." };
  }
  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("regiones")
    .select("activo")
    .eq("id", id)
    .maybeSingle<{ activo: boolean }>();
  if (!actual) return { error: "Región no encontrada." };

  const { error } = await sb
    .from("regiones")
    .update({ activo: !actual.activo } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/regiones");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Borra una región. Falla si tiene destinos asociados — el admin debe migrar
 * los destinos a otra región primero, o marcarla como inactiva.
 */
export async function deleteRegionAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar regiones." };
  }

  const sb = createAdminClient();
  const { count } = await sb
    .from("destinos")
    .select("id", { count: "exact", head: true })
    .eq("region_id", id);
  if ((count ?? 0) > 0) {
    return {
      error: `No se puede borrar: la región tiene ${count} destino${
        count === 1 ? "" : "s"
      } asignado${count === 1 ? "" : "s"}. Migralos a otra región o marcala como inactiva.`,
    };
  }

  // Borrar la foto del bucket si tenía una cargada (no dejar huérfanos).
  const { data: actual } = await sb
    .from("regiones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (actual?.foto_path) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  const { error } = await sb.from("regiones").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/regiones");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Persiste el `foto_path` de una región tras un upload exitoso al bucket
 * `destinos` (compartido con destinos; las regiones van bajo `regiones/<id>/…`).
 * Si había una foto previa, borra el objeto viejo. Solo super admin.
 */
export async function setRegionFotoAction(
  id: string,
  fotoPath: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede modificar la foto de la región." };
  }
  if (!fotoPath || fotoPath.length > 500) {
    return { error: "Path inválido." };
  }

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("regiones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Región no encontrada." };

  const { error } = await sb
    .from("regiones")
    .update({ foto_path: fotoPath } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (actual.foto_path && actual.foto_path !== fotoPath) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  revalidatePath("/admin/regiones");
  revalidatePath(`/admin/regiones/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** Borra la foto de la región (objeto en bucket + limpia la columna). */
export async function deleteRegionFotoAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar la foto de la región." };
  }

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("regiones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Región no encontrada." };
  if (!actual.foto_path) return { ok: true };

  await sb.storage.from("destinos").remove([actual.foto_path]);

  const { error } = await sb
    .from("regiones")
    .update({ foto_path: null } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/regiones");
  revalidatePath(`/admin/regiones/${id}`);
  revalidatePath("/");
  return { ok: true };
}
