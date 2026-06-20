"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { ZonaRow } from "@/types/database";

export interface ZonaListRow {
  id: string;
  slug: string;
  nombre: string;
  ciudadNombre: string | null;
  curadorNombre: string | null;
  destinosCount: number;
  atraccionesCount: number;
  activo: boolean;
  orden: number;
}

/** Opción para el multi-select de destinos / dropdowns. */
export interface OpcionDestino {
  id: string;
  nombre: string;
}

/** Opción para el dropdown de curador (admins). */
export interface OpcionCurador {
  id: string;
  label: string;
}

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const optionalUuid = z.string().uuid().nullable();

const zonaSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug muy corto")
    .max(60, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().trim().min(2, "Nombre muy corto").max(80),
  descripcion: z.string().trim().max(400).nullable(),
  ciudad_id: optionalUuid,
  curador_id: optionalUuid,
  activo: z.coerce.boolean().default(true),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
});

function parseZonaForm(formData: FormData): {
  raw: Record<string, unknown>;
  destinoIds: string[];
} {
  const str = (k: string): string | null => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  return {
    raw: {
      slug: str("slug") ?? "",
      nombre: str("nombre") ?? "",
      descripcion: str("descripcion"),
      ciudad_id: str("ciudad_id"),
      curador_id: str("curador_id"),
      activo:
        formData.get("activo") === "on" || formData.get("activo") === "true",
      orden: str("orden") ?? 0,
    },
    destinoIds: formData
      .getAll("destino_ids")
      .filter((v): v is string => typeof v === "string" && v !== ""),
  };
}

function formatZodError(err: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Hay errores en el formulario.", fieldErrors };
}

export async function listZonasAdmin(): Promise<ZonaListRow[]> {
  await requireAdmin();
  const sb = createAdminClient();

  const { data: zonas } = await sb
    .from("zonas")
    .select("*")
    .order("orden", { ascending: true })
    .returns<ZonaRow[]>();
  if (!zonas) return [];

  const { data: ciudades } = (await sb.from("ciudades").select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const ciudadNombre = new Map((ciudades ?? []).map((c) => [c.id, c.nombre]));

  const { data: perfiles } = (await sb
    .from("perfiles")
    .select("id, nombre")
    .eq("rol", "admin")) as {
    data: Array<{ id: string; nombre: string | null }> | null;
  };
  const curadorNombre = new Map(
    (perfiles ?? []).map((p) => [p.id, p.nombre ?? "(sin nombre)"])
  );

  const { data: links } = (await sb
    .from("zona_destinos")
    .select("zona_id")) as { data: Array<{ zona_id: string }> | null };
  const destinosCount = new Map<string, number>();
  for (const l of links ?? []) {
    destinosCount.set(l.zona_id, (destinosCount.get(l.zona_id) ?? 0) + 1);
  }

  const { data: atracs } = (await sb
    .from("atracciones")
    .select("zona_id")) as { data: Array<{ zona_id: string }> | null };
  const atraccionesCount = new Map<string, number>();
  for (const a of atracs ?? []) {
    atraccionesCount.set(a.zona_id, (atraccionesCount.get(a.zona_id) ?? 0) + 1);
  }

  return zonas.map((z) => ({
    id: z.id,
    slug: z.slug,
    nombre: z.nombre,
    ciudadNombre: z.ciudad_id ? ciudadNombre.get(z.ciudad_id) ?? null : null,
    curadorNombre: z.curador_id ? curadorNombre.get(z.curador_id) ?? null : null,
    destinosCount: destinosCount.get(z.id) ?? 0,
    atraccionesCount: atraccionesCount.get(z.id) ?? 0,
    activo: z.activo,
    orden: z.orden,
  }));
}

export async function getZona(
  id: string
): Promise<{ zona: ZonaRow; destinoIds: string[] } | null> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data: zona } = await sb
    .from("zonas")
    .select("*")
    .eq("id", id)
    .maybeSingle<ZonaRow>();
  if (!zona) return null;
  const { data: links } = (await sb
    .from("zona_destinos")
    .select("destino_id")
    .eq("zona_id", id)) as { data: Array<{ destino_id: string }> | null };
  return { zona, destinoIds: (links ?? []).map((l) => l.destino_id) };
}

/** Todos los destinos para el multi-select. */
export async function listDestinosParaZonas(): Promise<OpcionDestino[]> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data } = (await sb
    .from("destinos")
    .select("id, nombre")
    .order("nombre", { ascending: true })) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  return data ?? [];
}

/** Admins disponibles como curadores (label con destino para contexto). */
export async function listAdminsParaCurador(): Promise<OpcionCurador[]> {
  await requireAdmin();
  const sb = createAdminClient();
  const { data: perfiles } = (await sb
    .from("perfiles")
    .select("id, nombre, destino_id")
    .eq("rol", "admin")
    .order("nombre", { ascending: true })) as {
    data: Array<{
      id: string;
      nombre: string | null;
      destino_id: string | null;
    }> | null;
  };
  if (!perfiles) return [];

  const { data: destinos } = (await sb
    .from("destinos")
    .select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const destinoNombre = new Map((destinos ?? []).map((d) => [d.id, d.nombre]));

  return perfiles.map((p) => {
    const scope = p.destino_id
      ? destinoNombre.get(p.destino_id) ?? "destino"
      : "Super admin";
    return { id: p.id, label: `${p.nombre ?? "(sin nombre)"} · ${scope}` };
  });
}

async function replaceZonaDestinos(
  sb: ReturnType<typeof createAdminClient>,
  zonaId: string,
  destinoIds: string[]
): Promise<void> {
  await sb.from("zona_destinos").delete().eq("zona_id", zonaId);
  if (destinoIds.length > 0) {
    await sb
      .from("zona_destinos")
      .insert(
        destinoIds.map((d) => ({ zona_id: zonaId, destino_id: d })) as never
      );
  }
}

export async function createZonaAction(
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) return { error: "Solo super admin puede crear zonas." };

  const { raw, destinoIds } = parseZonaForm(formData);
  const parsed = zonaSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("zonas")
    .insert(parsed.data as never)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe una zona con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  await replaceZonaDestinos(sb, data.id, destinoIds);

  revalidatePath("/admin/zonas");
  revalidatePath("/");
  redirect(`/admin/zonas/${data.id}`);
}

export async function updateZonaAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) return { error: "Solo super admin puede editar zonas." };

  const { raw, destinoIds } = parseZonaForm(formData);
  const parsed = zonaSchema.safeParse(raw);
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const { error } = await sb
    .from("zonas")
    .update(parsed.data as never)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otra zona con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  await replaceZonaDestinos(sb, id, destinoIds);

  revalidatePath("/admin/zonas");
  revalidatePath(`/admin/zonas/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function toggleZonaActivaAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede activar/desactivar zonas." };
  }
  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("zonas")
    .select("activo")
    .eq("id", id)
    .maybeSingle<{ activo: boolean }>();
  if (!actual) return { error: "Zona no encontrada." };

  const { error } = await sb
    .from("zonas")
    .update({ activo: !actual.activo } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/zonas");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Borra una zona. `zona_destinos` cascadea; `atracciones` también (FK ON DELETE
 * CASCADE), así que borrar una zona borra sus atracciones. Solo super admin.
 */
export async function deleteZonaAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) return { error: "Solo super admin puede borrar zonas." };

  const sb = createAdminClient();
  const { error } = await sb.from("zonas").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/zonas");
  revalidatePath("/");
  return { ok: true };
}

export async function setZonaFotoAction(
  id: string,
  fotoPath: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede modificar la foto de la zona." };
  }
  if (!fotoPath || fotoPath.length > 500) return { error: "Path inválido." };

  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("zonas")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Zona no encontrada." };

  const { error } = await sb
    .from("zonas")
    .update({ foto_path: fotoPath } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (actual.foto_path && actual.foto_path !== fotoPath) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  revalidatePath("/admin/zonas");
  revalidatePath(`/admin/zonas/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteZonaFotoAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar la foto de la zona." };
  }
  const sb = createAdminClient();
  const { data: actual } = await sb
    .from("zonas")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Zona no encontrada." };
  if (!actual.foto_path) return { ok: true };

  await sb.storage.from("destinos").remove([actual.foto_path]);

  const { error } = await sb
    .from("zonas")
    .update({ foto_path: null } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/zonas");
  revalidatePath(`/admin/zonas/${id}`);
  revalidatePath("/");
  return { ok: true };
}
