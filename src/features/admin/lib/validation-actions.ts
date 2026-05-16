"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/features/admin/lib/auth";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";
import {
  notifyHospedajePublicado,
  notifyHospedajeRechazado,
} from "@/features/admin/lib/notifications";
import { assertAdminCanAccessHospedaje } from "@/features/admin/lib/scope";

async function setLatestEventNote(hospedajeId: string, notas: string) {
  const admin = createAdminClient();
  const { data: latest } = await admin
    .from("validacion_eventos")
    .select("id")
    .eq("hospedaje_id", hospedajeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: number }>();
  if (latest) {
    await admin
      .from("validacion_eventos")
      .update({ notas } as never)
      .eq("id", latest.id);
  }
}

export async function approveHospedajeAction(
  id: string,
  notas?: string
): Promise<ActionResult> {
  const user = await requireAdmin();
  try {
    await assertAdminCanAccessHospedaje(user, id);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const admin = createAdminClient();

  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "publicado" } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  if (notas && notas.trim()) await setLatestEventNote(id, notas.trim());

  // AWAIT directo: en serverless el fire-and-forget se pierde porque el
  // container termina con el response.
  await notifyHospedajePublicado(id);

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/validaciones");
  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${id}`);
  return { ok: true };
}

export async function rejectHospedajeAction(
  id: string,
  notas: string
): Promise<ActionResult> {
  const user = await requireAdmin();
  if (!notas?.trim()) {
    return { error: "Tenés que escribir el motivo del rechazo." };
  }
  try {
    await assertAdminCanAccessHospedaje(user, id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("hospedajes")
    .update({ estado: "rechazado" } as never)
    .eq("id", id);
  if (error) return { error: error.message };

  const motivo = notas.trim();
  await setLatestEventNote(id, motivo);

  await notifyHospedajeRechazado(id, motivo);

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/validaciones");
  revalidatePath("/admin/hospedajes");
  revalidatePath(`/admin/hospedajes/${id}`);
  revalidatePath(`/panel/hospedajes/${id}`);
  return { ok: true };
}
