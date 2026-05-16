"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

export interface AdminListRow {
  id: string;
  nombre: string | null;
  email: string;
  destinoId: string | null;
  destinoNombre: string | null;
  createdAt: string;
}

/**
 * Lista todos los perfiles con rol='admin' + su email (vía auth.users) +
 * nombre del destino al que están scoped (NULL = super admin).
 *
 * Solo super admin debería invocar esto (la página lo verifica).
 */
export async function listAdminsAction(): Promise<AdminListRow[]> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) return [];

  const sb = createAdminClient();
  const { data: perfiles } = await sb
    .from("perfiles")
    .select("id, nombre, destino_id, created_at, destinos(nombre)")
    .eq("rol", "admin")
    .order("created_at", { ascending: true })
    .returns<
      Array<{
        id: string;
        nombre: string | null;
        destino_id: string | null;
        created_at: string;
        destinos: { nombre: string } | null;
      }>
    >();

  if (!perfiles) return [];

  const rows: AdminListRow[] = [];
  for (const p of perfiles) {
    const { data: u } = await sb.auth.admin.getUserById(p.id);
    rows.push({
      id: p.id,
      nombre: p.nombre,
      email: u?.user?.email ?? "(sin email)",
      destinoId: p.destino_id,
      destinoNombre: p.destinos?.nombre ?? null,
      createdAt: p.created_at,
    });
  }
  return rows;
}

const createAdminLocalSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(2, "Nombre requerido").max(120),
  destinoId: z.string().uuid("Destino inválido"),
});

export interface CreateAdminLocalResult extends ActionResult {
  /** Password temporal generado. Mostrar UNA SOLA VEZ al super admin. */
  tempPassword?: string;
  email?: string;
}

/**
 * Crea un admin local nuevo asignado a un destino.
 *
 * Solo super admin puede invocarlo. Genera password aleatorio fuerte y lo
 * devuelve UNA vez para que el super admin se lo pase al admin local por
 * canal privado. El admin local podrá cambiarlo después vía "olvidé
 * contraseña".
 */
export async function createAdminLocalAction(
  input: z.infer<typeof createAdminLocalSchema>
): Promise<CreateAdminLocalResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede crear administradores." };
  }

  const parsed = createAdminLocalSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Datos inválidos.", fieldErrors };
  }

  const { email, nombre, destinoId } = parsed.data;
  const sb = createAdminClient();

  const { data: destino } = await sb
    .from("destinos")
    .select("id")
    .eq("id", destinoId)
    .maybeSingle<{ id: string }>();
  if (!destino) return { error: "El destino no existe." };

  const tempPassword = randomBytes(12).toString("base64").replace(/[+/=]/g, "");

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nombre },
  });
  if (createErr || !created.user) {
    return {
      error: createErr?.message ?? "No se pudo crear el usuario.",
    };
  }

  const { error: perfilErr } = await sb.from("perfiles").insert({
    id: created.user.id,
    nombre,
    rol: "admin",
    destino_id: destinoId,
    hospedajes_ids: [],
  } as never);

  if (perfilErr) {
    // Rollback: borrar el user creado para evitar quedar inconsistente.
    await sb.auth.admin.deleteUser(created.user.id);
    return {
      error: `Usuario creado pero falló el perfil: ${perfilErr.message}`,
    };
  }

  revalidatePath("/admin/admins");
  return { ok: true, tempPassword, email };
}

/**
 * Elimina un admin (cualquier scope). Solo super admin. Bloquea borrarse a
 * uno mismo para evitar quedar sin super admin.
 */
export async function deleteAdminAction(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!me.isSuperAdmin) {
    return { error: "Solo super admin puede borrar administradores." };
  }
  if (id === me.id) {
    return { error: "No te podés borrar a vos mismo." };
  }

  const sb = createAdminClient();
  const { error: perfilErr } = await sb.from("perfiles").delete().eq("id", id);
  if (perfilErr) return { error: perfilErr.message };

  const { error: authErr } = await sb.auth.admin.deleteUser(id);
  if (authErr) return { error: authErr.message };

  revalidatePath("/admin/admins");
  return { ok: true };
}
