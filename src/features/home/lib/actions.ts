"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión desde el header público (UserMenu de la home). A diferencia
 * de `signOutPanelAction` (que devuelve a /login), acá volvemos al hub `/`,
 * que es el lugar natural tras desloguearse desde la home.
 */
export async function signOutHomeAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
