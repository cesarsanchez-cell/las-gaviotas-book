"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type AdminUser } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import type { AtraccionRow } from "@/types/database";
import type { OpcionDestino } from "@/features/admin/lib/zona-management";

export interface AtraccionListRow {
  id: string;
  slug: string;
  nombre: string;
  zonaNombre: string | null;
  destinoAnclaNombre: string | null;
  categoria: string | null;
  vigenciaLabel: string;
  publicada: boolean;
  orden: number;
}

/** Zona con sus destinos, para el form (filtra el ancla por zona). */
export interface ZonaConDestinos {
  id: string;
  nombre: string;
  destinos: OpcionDestino[];
}

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const optionalUuid = z.string().uuid().nullable();
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
  .nullable();

const atraccionSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug muy corto")
    .max(80, "Slug muy largo")
    .regex(slugRegex, "Solo minúsculas, números y guiones"),
  nombre: z.string().trim().min(2, "Nombre muy corto").max(120),
  descripcion: z.string().trim().max(1000).nullable(),
  categoria: z.string().trim().max(40).nullable(),
  zona_id: z.string().uuid("Elegí una zona"),
  destino_ancla_id: optionalUuid,
  ubicacion_texto: z.string().trim().max(160).nullable(),
  vigencia_desde: dateStr,
  vigencia_hasta: dateStr,
  publicada: z.coerce.boolean().default(false),
  destacada: z.coerce.boolean().default(false),
  orden: z.coerce.number().int().min(0).max(10000).default(0),
});

function parseAtraccionForm(formData: FormData): Record<string, unknown> {
  const str = (k: string): string | null => {
    const v = formData.get(k);
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  };
  const bool = (k: string): boolean =>
    formData.get(k) === "on" || formData.get(k) === "true";
  return {
    slug: str("slug") ?? "",
    nombre: str("nombre") ?? "",
    descripcion: str("descripcion"),
    categoria: str("categoria"),
    zona_id: str("zona_id") ?? "",
    destino_ancla_id: str("destino_ancla_id"),
    ubicacion_texto: str("ubicacion_texto"),
    vigencia_desde: str("vigencia_desde"),
    vigencia_hasta: str("vigencia_hasta"),
    publicada: bool("publicada"),
    destacada: bool("destacada"),
    orden: str("orden") ?? 0,
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

type Sb = ReturnType<typeof createAdminClient>;

/** ¿El admin puede curar esta zona? Devuelve los destinos de la zona si sí. */
async function canCurateZona(
  sb: Sb,
  me: AdminUser,
  zonaId: string
): Promise<{ ok: true; destinoIds: string[] } | { ok: false; error: string }> {
  const { data: zona } = await sb
    .from("zonas")
    .select("curador_id")
    .eq("id", zonaId)
    .maybeSingle<{ curador_id: string | null }>();
  if (!zona) return { ok: false, error: "Zona no encontrada." };
  if (!me.isSuperAdmin && zona.curador_id !== me.id) {
    return { ok: false, error: "No sos curador de esta zona." };
  }
  const { data: links } = (await sb
    .from("zona_destinos")
    .select("destino_id")
    .eq("zona_id", zonaId)) as { data: Array<{ destino_id: string }> | null };
  return { ok: true, destinoIds: (links ?? []).map((l) => l.destino_id) };
}

function vigenciaLabel(desde: string | null, hasta: string | null): string {
  if (!desde && !hasta) return "Permanente";
  const fmt = (s: string) =>
    new Date(s + "T00:00").toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
    });
  if (desde && hasta) return `${fmt(desde)} → ${fmt(hasta)}`;
  if (hasta) return `Hasta ${fmt(hasta)}`;
  return `Desde ${fmt(desde as string)}`;
}

export async function listAtraccionesAdmin(): Promise<AtraccionListRow[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();

  // Curador (admin local) solo ve atracciones de las zonas que cura.
  let zonaIds: string[] | null = null;
  if (!me.isSuperAdmin) {
    const { data: zs } = (await sb
      .from("zonas")
      .select("id")
      .eq("curador_id", me.id)) as { data: Array<{ id: string }> | null };
    zonaIds = (zs ?? []).map((z) => z.id);
    if (zonaIds.length === 0) return [];
  }

  let query = sb.from("atracciones").select("*").order("orden", {
    ascending: true,
  });
  if (zonaIds) query = query.in("zona_id", zonaIds);
  const { data: atracs } = await query.returns<AtraccionRow[]>();
  if (!atracs) return [];

  const { data: zonas } = (await sb.from("zonas").select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const zonaNombre = new Map((zonas ?? []).map((z) => [z.id, z.nombre]));

  const { data: destinos } = (await sb
    .from("destinos")
    .select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const destinoNombre = new Map((destinos ?? []).map((d) => [d.id, d.nombre]));

  return atracs.map((a) => ({
    id: a.id,
    slug: a.slug,
    nombre: a.nombre,
    zonaNombre: zonaNombre.get(a.zona_id) ?? null,
    destinoAnclaNombre: a.destino_ancla_id
      ? destinoNombre.get(a.destino_ancla_id) ?? null
      : null,
    categoria: a.categoria,
    vigenciaLabel: vigenciaLabel(a.vigencia_desde, a.vigencia_hasta),
    publicada: a.publicada,
    orden: a.orden,
  }));
}

export async function getAtraccion(id: string): Promise<AtraccionRow | null> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  const { data } = await sb
    .from("atracciones")
    .select("*")
    .eq("id", id)
    .maybeSingle<AtraccionRow>();
  if (!data) return null;
  const scope = await canCurateZona(sb, me, data.zona_id);
  if (!scope.ok) return null;
  return data;
}

/** Zonas que el admin puede curar, cada una con sus destinos (para el form). */
export async function listZonasParaAtraccion(): Promise<ZonaConDestinos[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();

  const { data: zonas } = (await sb
    .from("zonas")
    .select("id, nombre, curador_id")
    .order("orden", { ascending: true })) as {
    data: Array<{ id: string; nombre: string; curador_id: string | null }> | null;
  };
  if (!zonas) return [];
  const visibles = me.isSuperAdmin
    ? zonas
    : zonas.filter((z) => z.curador_id === me.id);
  if (visibles.length === 0) return [];

  const { data: links } = (await sb
    .from("zona_destinos")
    .select("zona_id, destino_id")) as {
    data: Array<{ zona_id: string; destino_id: string }> | null;
  };
  const { data: destinos } = (await sb
    .from("destinos")
    .select("id, nombre")) as {
    data: Array<{ id: string; nombre: string }> | null;
  };
  const destinoNombre = new Map((destinos ?? []).map((d) => [d.id, d.nombre]));

  const destinosPorZona = new Map<string, OpcionDestino[]>();
  for (const l of links ?? []) {
    const arr = destinosPorZona.get(l.zona_id) ?? [];
    arr.push({ id: l.destino_id, nombre: destinoNombre.get(l.destino_id) ?? "?" });
    destinosPorZona.set(l.zona_id, arr);
  }

  return visibles.map((z) => ({
    id: z.id,
    nombre: z.nombre,
    destinos: destinosPorZona.get(z.id) ?? [],
  }));
}

async function validateAndScope(
  sb: Sb,
  me: AdminUser,
  data: z.infer<typeof atraccionSchema>
): Promise<ActionResult | null> {
  if (
    data.vigencia_desde &&
    data.vigencia_hasta &&
    data.vigencia_hasta < data.vigencia_desde
  ) {
    return {
      error: "La vigencia es incoherente.",
      fieldErrors: {
        vigencia_hasta: "La fecha de fin no puede ser anterior al inicio.",
      },
    };
  }
  const scope = await canCurateZona(sb, me, data.zona_id);
  if (!scope.ok) return { error: scope.error, fieldErrors: { zona_id: scope.error } };
  if (data.destino_ancla_id && !scope.destinoIds.includes(data.destino_ancla_id)) {
    return {
      error: "El destino ancla debe pertenecer a la zona.",
      fieldErrors: { destino_ancla_id: "Elegí un destino de la zona." },
    };
  }
  return null;
}

export async function createAtraccionAction(
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = atraccionSchema.safeParse(parseAtraccionForm(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();
  const invalid = await validateAndScope(sb, me, parsed.data);
  if (invalid) return invalid;

  const { data, error } = await sb
    .from("atracciones")
    .insert(parsed.data as never)
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe una atracción con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/atracciones");
  revalidatePath("/");
  redirect(`/admin/atracciones/${data.id}`);
}

export async function updateAtraccionAction(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = atraccionSchema.safeParse(parseAtraccionForm(formData));
  if (!parsed.success) return formatZodError(parsed.error);

  const sb = createAdminClient();

  // El que edita debe poder curar tanto la zona actual como la nueva.
  const { data: actual } = await sb
    .from("atracciones")
    .select("zona_id")
    .eq("id", id)
    .maybeSingle<{ zona_id: string }>();
  if (!actual) return { error: "Atracción no encontrada." };
  const scopeActual = await canCurateZona(sb, me, actual.zona_id);
  if (!scopeActual.ok) return { error: scopeActual.error };

  const invalid = await validateAndScope(sb, me, parsed.data);
  if (invalid) return invalid;

  const { error } = await sb
    .from("atracciones")
    .update(parsed.data as never)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        error: "Ya existe otra atracción con ese slug.",
        fieldErrors: { slug: "Slug duplicado" },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/atracciones");
  revalidatePath(`/admin/atracciones/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** Helper de permiso para acciones que parten de una atracción existente. */
async function requireCanCurateAtraccion(
  sb: Sb,
  me: AdminUser,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await sb
    .from("atracciones")
    .select("zona_id")
    .eq("id", id)
    .maybeSingle<{ zona_id: string }>();
  if (!data) return { ok: false, error: "Atracción no encontrada." };
  const scope = await canCurateZona(sb, me, data.zona_id);
  return scope.ok ? { ok: true } : { ok: false, error: scope.error };
}

export async function togglePublicadaAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  const perm = await requireCanCurateAtraccion(sb, me, id);
  if (!perm.ok) return { error: perm.error };

  const { data: actual } = await sb
    .from("atracciones")
    .select("publicada")
    .eq("id", id)
    .maybeSingle<{ publicada: boolean }>();
  if (!actual) return { error: "Atracción no encontrada." };

  const { error } = await sb
    .from("atracciones")
    .update({ publicada: !actual.publicada } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/atracciones");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAtraccionAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  const perm = await requireCanCurateAtraccion(sb, me, id);
  if (!perm.ok) return { error: perm.error };

  const { data: actual } = await sb
    .from("atracciones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();

  const { error } = await sb.from("atracciones").delete().eq("id", id);
  if (error) return { error: error.message };
  if (actual?.foto_path) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  revalidatePath("/admin/atracciones");
  revalidatePath("/");
  return { ok: true };
}

export async function setAtraccionFotoAction(
  id: string,
  fotoPath: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!fotoPath || fotoPath.length > 500) return { error: "Path inválido." };
  const sb = createAdminClient();
  const perm = await requireCanCurateAtraccion(sb, me, id);
  if (!perm.ok) return { error: perm.error };

  const { data: actual } = await sb
    .from("atracciones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Atracción no encontrada." };

  const { error } = await sb
    .from("atracciones")
    .update({ foto_path: fotoPath } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (actual.foto_path && actual.foto_path !== fotoPath) {
    await sb.storage.from("destinos").remove([actual.foto_path]);
  }

  revalidatePath("/admin/atracciones");
  revalidatePath(`/admin/atracciones/${id}`);
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAtraccionFotoAction(
  id: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  const perm = await requireCanCurateAtraccion(sb, me, id);
  if (!perm.ok) return { error: perm.error };

  const { data: actual } = await sb
    .from("atracciones")
    .select("foto_path")
    .eq("id", id)
    .maybeSingle<{ foto_path: string | null }>();
  if (!actual) return { error: "Atracción no encontrada." };
  if (!actual.foto_path) return { ok: true };

  await sb.storage.from("destinos").remove([actual.foto_path]);
  const { error } = await sb
    .from("atracciones")
    .update({ foto_path: null } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/atracciones");
  revalidatePath(`/admin/atracciones/${id}`);
  revalidatePath("/");
  return { ok: true };
}
