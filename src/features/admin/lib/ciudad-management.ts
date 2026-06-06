"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { CiudadRow } from "@/types/database";

export interface CiudadListRow {
  id: string;
  slug: string;
  nombre: string;
  regionId: string | null;
  regionNombre: string | null;
  codigoPostal: string | null;
  activo: boolean;
  orden: number;
  destinosCount: number;
}

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ciudadSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug muy corto")
    .max(60, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().trim().min(2, "Nombre muy corto").max(80),
  region_id: z.string().uuid("Elegí una región"),
  codigo_postal: z
    .string()
    .trim()
    .max(12)
    .optional()
    .or(z.literal("").transform(() => null)),
  activo: z.coerce.boolean().default(true),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
});

/**
 * Lista todas las ciudades con conteo de destinos y nombre de su región. Solo
 * super admin escribe, pero cualquier admin puede ver el listado.
 */
export async function listCiudadesAdmin(): Promise<CiudadListRow[]> {
  await requireAdmin();
  const sb = createAdminClient();

  const { data: ciudades } = await sb
    .from("ciudades")
    .select("*")
    .order("orden", { ascending: true })
    .returns<CiudadRow[]>();
  if (!ciudades) return [];

  const { data: regiones } = (await sb
    .from("regiones")
    .select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const regionNombre = new Map((regiones ?? []).map((r) => [r.id, r.nombre]));

  const { data: counts } = (await sb
    .from("destinos")
    .select("ciudad_id")
    .not("ciudad_id", "is", null)) as {
    data: Array<{ ciudad_id: string | null }> | null;
  };
  const countByCiudad = new Map<string, number>();
  for (const d of counts ?? []) {
    if (!d.ciudad_id) continue;
    countByCiudad.set(d.ciudad_id, (countByCiudad.get(d.ciudad_id) ?? 0) + 1);
  }

  return ciudades.map((c) => ({
    id: c.id,
    slug: c.slug,
    nombre: c.nombre,
    regionId: c.region_id,
    regionNombre: c.region_id ? regionNombre.get(c.region_id) ?? null : null,
    codigoPostal: c.codigo_postal,
    activo: c.activo,
    orden: c.orden,
    destinosCount: countByCiudad.get(c.id) ?? 0,
  }));
}

export async function getCiudad(id: string): Promise<CiudadRow | null> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("ciudades")
    .select("*")
    .eq("id", id)
    .maybeSingle<CiudadRow>();
  return data;
}

function parseFormData(formData: FormData): unknown {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "activo") {
      raw[k] = v === "on" || v === "true";
    } else if (typeof v === "string" && v.trim() === "") {
      // skip empty
    } else {
      raw[k] = v;
    }
  }
  if (!("activo" in raw)) raw.activo = false;
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

export async function createCiudadAction(
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede crear ciudades." };
  }

  const parsed = ciudadSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("ciudades")
    .insert(parsed.data as never)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe una ciudad con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/ciudades");
  revalidatePath("/");
  redirect(`/admin/ciudades/${data.id}`);
}

export async function updateCiudadAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede editar ciudades." };
  }

  const parsed = ciudadSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { error } = await sb
    .from("ciudades")
    .update(parsed.data as never)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otra ciudad con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/ciudades");
  revalidatePath(`/admin/ciudades/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleCiudadActivaAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede activar/desactivar ciudades." };
  }
  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("ciudades")
    .select("activo")
    .eq("id", id)
    .maybeSingle<{ activo: boolean }>();
  if (!actual) return { error: "Ciudad no encontrada." };

  const { error } = await sb
    .from("ciudades")
    .update({ activo: !actual.activo } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ciudades");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Borra una ciudad. La FK `destinos.ciudad_id` es ON DELETE SET NULL, así que
 * los destinos quedan sin ciudad (no se borran). Solo super admin.
 */
export async function deleteCiudadAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar ciudades." };
  }

  const sb = createAdminClient();
  const { error } = await sb.from("ciudades").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/ciudades");
  revalidatePath("/");
  return { ok: true };
}
