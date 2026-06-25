"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
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
  /** Email al que se mandó la invitación. */
  email?: string;
  /** Link de recuperación para que el admin defina su contraseña (para debugging/testing). */
  actionLink?: string;
}

/**
 * Invita un admin local nuevo asignado a un destino por email.
 * El admin recibe un link a /admin/registro?email=X&nombre=Y donde se auto-registra.
 *
 * Solo super admin puede invocarlo.
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";

  // Generar link de registro: /admin/registro?email=X&nombre=Y
  const params = new URLSearchParams({
    email,
    nombre,
    destino_id: destinoId,
  });
  const actionLink = `${siteUrl}/admin/registro?${params.toString()}`;

  // Enviar email con link de registro
  const emailResult = await sendEmail({
    to: email,
    subject: "Crea tu cuenta de administrador",
    html: `
      <p>Hola ${nombre},</p>
      <p>Haz click en el link para crear tu cuenta y acceder al panel de administrador:</p>
      <a href="${actionLink}">Crear cuenta</a>
      <p>El link es válido por 24 horas.</p>
    `,
  });
  if (!emailResult.ok) {
    return {
      error: `Email fallo: ${emailResult.error}`,
    };
  }

  revalidatePath("/admin/admins");
  return { ok: true, email, actionLink };
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
