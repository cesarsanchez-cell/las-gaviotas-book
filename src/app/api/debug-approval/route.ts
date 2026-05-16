import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Diagnóstico: dado un hospedaje_id, devuelve qué encuentra el flow de
 * notificación post-aprobación. Sirve para detectar por qué no se manda
 * el mail (responsable no encontrado, sin email, etc).
 *
 * USO: GET /api/debug-approval?hid=<hospedaje-uuid>
 */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Sin sesión admin" }, { status: 401 });
  }

  const url = new URL(request.url);
  const hid = url.searchParams.get("hid");
  if (!hid) {
    return NextResponse.json(
      { error: "Pasá ?hid=<uuid> en la query" },
      { status: 400 }
    );
  }

  const sbAdmin = createAdminClient();

  // 1) Hospedaje
  const { data: h, error: he } = await sbAdmin
    .from("hospedajes")
    .select("id, slug, nombre, destino_id, estado")
    .eq("id", hid)
    .maybeSingle();

  if (he || !h) {
    return NextResponse.json({
      step: "hospedaje",
      ok: false,
      error: he?.message ?? "Hospedaje no encontrado",
    });
  }

  // 2) Destino
  const { data: d } = await sbAdmin
    .from("destinos")
    .select("slug, nombre")
    .eq("id", (h as { destino_id: string }).destino_id)
    .maybeSingle();

  // 3) Responsable: perfil cuyo hospedajes_ids contiene este hid
  const { data: perfilContains } = await sbAdmin
    .from("perfiles")
    .select("id, nombre, rol, hospedajes_ids")
    .contains("hospedajes_ids", [hid]);

  // 4) Todos los perfiles responsables (para comparar)
  const { data: allResponsables } = await sbAdmin
    .from("perfiles")
    .select("id, nombre, rol, hospedajes_ids")
    .eq("rol", "responsable");

  // 5) Si encontramos el responsable, buscamos su email
  let responsableEmail: string | null = null;
  let responsableId: string | null = null;
  const perfilResp = perfilContains?.find(
    (p) => (p as { rol: string }).rol === "responsable"
  );
  if (perfilResp) {
    responsableId = (perfilResp as { id: string }).id;
    const { data: userInfo } = await sbAdmin.auth.admin.getUserById(
      responsableId
    );
    responsableEmail = userInfo?.user?.email ?? null;
  }

  return NextResponse.json({
    hospedaje: h,
    destino: d,
    perfilesQueLoContienen: perfilContains,
    todosLosResponsables: allResponsables?.map((p) => ({
      id: (p as { id: string }).id,
      nombre: (p as { nombre: string | null }).nombre,
      hospedajes_ids: (p as { hospedajes_ids: string[] }).hospedajes_ids,
    })),
    responsableEncontrado: !!perfilResp,
    responsableId,
    responsableEmail,
    diagnostico: !perfilResp
      ? "NO se encontró perfil responsable cuyo hospedajes_ids contenga este hid. Por eso no se manda mail."
      : !responsableEmail
        ? "Perfil encontrado pero sin email en auth.users. Caso raro."
        : "OK — debería haberse mandado mail a responsableEmail.",
  });
}
