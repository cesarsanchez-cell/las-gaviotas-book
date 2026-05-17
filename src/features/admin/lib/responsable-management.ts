"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

export interface ResponsableListRow {
  id: string;
  nombre: string | null;
  email: string;
  hospedajes: Array<{ id: string; nombre: string; destinoId: string }>;
  createdAt: string;
}

export interface HospedajeOption {
  id: string;
  nombre: string;
  destinoNombre: string;
  destinoId: string;
}

/**
 * Lista responsables visibles para el admin actual.
 *
 * - Super admin: ve todos los responsables (con todos sus hospedajes).
 * - Admin local: solo ve responsables que tengan al menos un hospedaje en
 *   su destino. Para esos responsables, devolvemos TODOS sus hospedajes
 *   (no filtramos por destino dentro del row) para que el admin local vea
 *   el contexto completo aunque algún hospedaje esté fuera de su scope.
 */
export async function listResponsablesAction(): Promise<ResponsableListRow[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();

  const { data: perfiles } = await sb
    .from("perfiles")
    .select("id, nombre, hospedajes_ids, created_at")
    .eq("rol", "responsable")
    .order("created_at", { ascending: true })
    .returns<
      Array<{
        id: string;
        nombre: string | null;
        hospedajes_ids: string[] | null;
        created_at: string;
      }>
    >();
  if (!perfiles) return [];

  // Hospedajes por id para joinear y aplicar scope.
  const allHospedajeIds = Array.from(
    new Set(perfiles.flatMap((p) => p.hospedajes_ids ?? []))
  );
  const hospedajesById = new Map<
    string,
    { id: string; nombre: string; destino_id: string }
  >();
  if (allHospedajeIds.length > 0) {
    const { data: hosps } = await sb
      .from("hospedajes")
      .select("id, nombre, destino_id")
      .in("id", allHospedajeIds)
      .returns<Array<{ id: string; nombre: string; destino_id: string }>>();
    for (const h of hosps ?? []) hospedajesById.set(h.id, h);
  }

  const rows: ResponsableListRow[] = [];
  for (const p of perfiles) {
    const hospedajes = (p.hospedajes_ids ?? [])
      .map((id) => hospedajesById.get(id))
      .filter((h): h is { id: string; nombre: string; destino_id: string } => !!h);

    // Scope: admin local solo ve responsables con al menos un hospedaje en su destino.
    if (!me.isSuperAdmin) {
      const hasInScope = hospedajes.some((h) => h.destino_id === me.destinoId);
      if (!hasInScope) continue;
    }

    const { data: u } = await sb.auth.admin.getUserById(p.id);
    rows.push({
      id: p.id,
      nombre: p.nombre,
      email: u?.user?.email ?? "(sin email)",
      hospedajes: hospedajes.map((h) => ({
        id: h.id,
        nombre: h.nombre,
        destinoId: h.destino_id,
      })),
      createdAt: p.created_at,
    });
  }
  return rows;
}

/**
 * Lista hospedajes que el admin actual puede asignar a un responsable.
 * Super admin: todos. Admin local: solo los de su destino.
 */
export async function listHospedajesForAsignacion(): Promise<HospedajeOption[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  let q = sb
    .from("hospedajes")
    .select("id, nombre, destino_id, destinos!inner(nombre)")
    .order("nombre");
  if (!me.isSuperAdmin) q = q.eq("destino_id", me.destinoId!);
  const { data } = await q.returns<
    Array<{
      id: string;
      nombre: string;
      destino_id: string;
      destinos: { nombre: string };
    }>
  >();
  return (data ?? []).map((h) => ({
    id: h.id,
    nombre: h.nombre,
    destinoId: h.destino_id,
    destinoNombre: h.destinos.nombre,
  }));
}

const createResponsableSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(2, "Nombre requerido").max(120),
  hospedajeIds: z
    .array(z.string().uuid())
    .min(1, "Asigná al menos un hospedaje"),
});

export interface CreateResponsableResult extends ActionResult {
  /** Password temporal. Mostrar UNA SOLA VEZ al admin. */
  tempPassword?: string;
  email?: string;
}

/**
 * Crea un responsable nuevo + lo vincula a uno o más hospedajes.
 *
 * Scope: admin local solo puede asignar hospedajes de su destino. Super
 * admin puede asignar de cualquier destino.
 *
 * Genera password temporal aleatorio que devolvemos al admin para que se
 * lo pase al responsable por canal privado.
 */
export async function createResponsableAction(
  input: z.infer<typeof createResponsableSchema>
): Promise<CreateResponsableResult> {
  const me = await requireAdmin();
  const parsed = createResponsableSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }

  const { email, nombre, hospedajeIds } = parsed.data;
  const sb = createAdminClient();

  // Validar que todos los hospedajes existan y estén dentro del scope del admin.
  const { data: hospedajes } = await sb
    .from("hospedajes")
    .select("id, destino_id")
    .in("id", hospedajeIds)
    .returns<Array<{ id: string; destino_id: string }>>();
  if (!hospedajes || hospedajes.length !== hospedajeIds.length) {
    return { error: "Alguno de los hospedajes seleccionados no existe." };
  }
  if (!me.isSuperAdmin) {
    const fueraScope = hospedajes.find((h) => h.destino_id !== me.destinoId);
    if (fueraScope) {
      return { error: "No podés asignar hospedajes de otro destino." };
    }
  }

  const tempPassword = randomBytes(12).toString("base64").replace(/[+/=]/g, "");
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (createErr || !created.user) {
    return { error: createErr?.message ?? "No se pudo crear el usuario." };
  }

  const { error: perfilErr } = await sb.from("perfiles").insert({
    id: created.user.id,
    nombre,
    rol: "responsable",
    hospedajes_ids: hospedajeIds,
  } as never);
  if (perfilErr) {
    await sb.auth.admin.deleteUser(created.user.id);
    return {
      error: `Usuario creado pero falló el perfil: ${perfilErr.message}`,
    };
  }

  revalidatePath("/admin/responsables");
  return { ok: true, tempPassword, email };
}

const updateResponsableSchema = z.object({
  responsableId: z.string().uuid(),
  nombre: z.string().trim().min(2, "Nombre requerido").max(120),
  hospedajeIds: z.array(z.string().uuid()),
});

/**
 * Actualiza nombre + hospedajes asignados de un responsable. El email NO
 * se modifica desde acá (cambiar email en Supabase Auth dispara verificación
 * y puede confundir al responsable — se hace por separado si hace falta).
 *
 * Scope:
 *  - Admin local solo puede modificar si TODOS los hospedajes actuales y
 *    nuevos del responsable están en su destino. Si tiene hospedajes en
 *    otros destinos, requiere super admin.
 */
export async function updateResponsableAction(
  input: z.infer<typeof updateResponsableSchema>
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = updateResponsableSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }

  const sb = createAdminClient();
  const { data: perfil } = await sb
    .from("perfiles")
    .select("id, rol, hospedajes_ids")
    .eq("id", parsed.data.responsableId)
    .maybeSingle<{
      id: string;
      rol: string;
      hospedajes_ids: string[] | null;
    }>();
  if (!perfil || perfil.rol !== "responsable") {
    return { error: "El responsable no existe." };
  }

  if (!me.isSuperAdmin) {
    const idsACheck = Array.from(
      new Set([...(perfil.hospedajes_ids ?? []), ...parsed.data.hospedajeIds])
    );
    if (idsACheck.length > 0) {
      const { data: hosps } = await sb
        .from("hospedajes")
        .select("id, destino_id")
        .in("id", idsACheck)
        .returns<Array<{ id: string; destino_id: string }>>();
      const fueraScope = (hosps ?? []).find(
        (h) => h.destino_id !== me.destinoId
      );
      if (fueraScope) {
        return {
          error:
            "Este responsable tiene hospedajes fuera de tu destino. Solo super admin puede modificarlo.",
        };
      }
    }
  }

  const { error } = await sb
    .from("perfiles")
    .update({
      nombre: parsed.data.nombre,
      hospedajes_ids: parsed.data.hospedajeIds,
    } as never)
    .eq("id", parsed.data.responsableId);
  if (error) return { error: error.message };

  revalidatePath("/admin/responsables");
  return { ok: true };
}

/**
 * Borra un responsable (perfil + user de auth). Las consultas vinculadas
 * a sus hospedajes quedan en la BD (no se cascadean — la FK es del lado
 * de hospedajes_ids, no en consultas).
 *
 * Scope: idem updateResponsableHospedajesAction — admin local solo si
 * todos los hospedajes del responsable son de su destino.
 */
export async function deleteResponsableAction(
  responsableId: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = z.string().uuid().safeParse(responsableId);
  if (!parsed.success) return { error: "ID inválido." };

  const sb = createAdminClient();
  const { data: perfil } = await sb
    .from("perfiles")
    .select("id, rol, hospedajes_ids")
    .eq("id", responsableId)
    .maybeSingle<{
      id: string;
      rol: string;
      hospedajes_ids: string[] | null;
    }>();
  if (!perfil || perfil.rol !== "responsable") {
    return { error: "El responsable no existe." };
  }

  if (!me.isSuperAdmin && (perfil.hospedajes_ids ?? []).length > 0) {
    const { data: hosps } = await sb
      .from("hospedajes")
      .select("id, destino_id")
      .in("id", perfil.hospedajes_ids ?? [])
      .returns<Array<{ destino_id: string }>>();
    const fueraScope = (hosps ?? []).find((h) => h.destino_id !== me.destinoId);
    if (fueraScope) {
      return {
        error:
          "Este responsable tiene hospedajes en otro destino. Solo super admin puede borrarlo.",
      };
    }
  }

  const { error: perfilErr } = await sb
    .from("perfiles")
    .delete()
    .eq("id", responsableId);
  if (perfilErr) return { error: perfilErr.message };

  const { error: authErr } = await sb.auth.admin.deleteUser(responsableId);
  if (authErr) return { error: authErr.message };

  revalidatePath("/admin/responsables");
  return { ok: true };
}
