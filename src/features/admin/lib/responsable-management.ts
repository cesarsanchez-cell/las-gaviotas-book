"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/admin/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/features/admin/lib/hospedaje-actions";

export interface EntidadAsignada {
  id: string;
  nombre: string;
  destinoId: string;
  tipo: "hospedaje" | "gastronomico";
}

export interface ResponsableListRow {
  id: string;
  nombre: string | null;
  email: string;
  entidades: EntidadAsignada[];
  createdAt: string;
  /**
   * true si el perfil tambien tiene rol=admin (doble funcion admin+operador).
   * Sirve para mostrar un chip "Admin local" o "Super admin" en el listado.
   */
  isAlsoAdmin: boolean;
  /** Si es admin, indica si es super admin (destino_id null). */
  isSuperAdmin: boolean;
}

export interface EntidadAsignable {
  tipo: "hospedaje" | "gastronomico";
  id: string;
  nombre: string;
  destinoNombre: string;
  destinoId: string;
}

type ResponsabilidadDB = {
  perfil_id: string;
  entidad_tipo: "hospedaje" | "lugar";
  entidad_id: string;
};

/**
 * Lista responsables visibles para el admin actual.
 *
 * - Super admin: ve todos los responsables (con todas sus entidades).
 * - Admin local: solo ve responsables que tengan al menos UNA entidad
 *   (hospedaje o gastronómico) en su destino, y de cada uno devolvemos
 *   SOLO las entidades de su destino. Nunca exponemos las que el
 *   responsable tenga en otros destinos (eso sería un read cross-tenant).
 *
 * También incluye responsables "sueltos" (sin entidades asignadas): solo
 * los ve el super admin, porque un admin local sin entidad en común no
 * tiene cómo determinar si le corresponde.
 *
 * Cross-listing: si un Admin Local (o Super Admin) tiene responsabilidades
 * sobre alguna entidad, también aparece en este listado con el chip
 * "Admin local" para marcar la doble función. Esto da visibilidad al
 * Super Admin de TODOS los que gestionan negocios, sin importar el rol
 * primario.
 */
export async function listResponsablesAction(): Promise<ResponsableListRow[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();

  // Traemos perfiles con rol=responsable Y todos los rol=admin que tengan
  // al menos una responsabilidad (admin local con doble función).
  const { data: perfilesResp } = await sb
    .from("perfiles")
    .select("id, nombre, rol, destino_id, created_at")
    .in("rol", ["responsable", "admin"])
    .order("created_at", { ascending: true })
    .returns<
      Array<{
        id: string;
        nombre: string | null;
        rol: string;
        destino_id: string | null;
        created_at: string;
      }>
    >();
  if (!perfilesResp) return [];

  // De los admins, solo conservamos los que tienen al menos una responsabilidad.
  // Los admins puros (sin entidades) ya se gestionan desde /admin/admins.
  const adminIds = perfilesResp.filter((p) => p.rol === "admin").map((p) => p.id);
  const adminsConRespIds = new Set<string>();
  if (adminIds.length > 0) {
    const { data: adminResps } = await sb
      .from("responsabilidades")
      .select("perfil_id")
      .in("perfil_id", adminIds)
      .returns<Array<{ perfil_id: string }>>();
    for (const r of adminResps ?? []) adminsConRespIds.add(r.perfil_id);
  }

  const perfiles = perfilesResp.filter(
    (p) => p.rol === "responsable" || adminsConRespIds.has(p.id)
  );

  const perfilIds = perfiles.map((p) => p.id);
  if (perfilIds.length === 0) return [];

  // Responsabilidades (fuente nueva de verdad — incluye hospedajes Y lugares).
  const { data: resps } = await sb
    .from("responsabilidades")
    .select("perfil_id, entidad_tipo, entidad_id")
    .in("perfil_id", perfilIds)
    .returns<ResponsabilidadDB[]>();

  // Resolver nombres y destino_id de hospedajes y lugares.
  const hospedajeIds = Array.from(
    new Set((resps ?? []).filter((r) => r.entidad_tipo === "hospedaje").map((r) => r.entidad_id))
  );
  const lugarIds = Array.from(
    new Set((resps ?? []).filter((r) => r.entidad_tipo === "lugar").map((r) => r.entidad_id))
  );

  const hospedajesById = new Map<string, { id: string; nombre: string; destino_id: string }>();
  if (hospedajeIds.length > 0) {
    const { data } = await sb
      .from("hospedajes")
      .select("id, nombre, destino_id")
      .in("id", hospedajeIds)
      .returns<Array<{ id: string; nombre: string; destino_id: string }>>();
    for (const h of data ?? []) hospedajesById.set(h.id, h);
  }

  const lugaresById = new Map<string, { id: string; nombre: string; destino_id: string; tipo: string }>();
  if (lugarIds.length > 0) {
    const { data } = await sb
      .from("lugares")
      .select("id, nombre, destino_id, tipo")
      .in("id", lugarIds)
      .returns<Array<{ id: string; nombre: string; destino_id: string; tipo: string }>>();
    for (const l of data ?? []) lugaresById.set(l.id, l);
  }

  // Index responsabilidades por perfil.
  const respsByPerfil = new Map<string, EntidadAsignada[]>();
  for (const r of resps ?? []) {
    const arr = respsByPerfil.get(r.perfil_id) ?? [];
    if (r.entidad_tipo === "hospedaje") {
      const h = hospedajesById.get(r.entidad_id);
      if (h) arr.push({ id: h.id, nombre: h.nombre, destinoId: h.destino_id, tipo: "hospedaje" });
    } else {
      const l = lugaresById.get(r.entidad_id);
      if (l && l.tipo === "gastronomico") {
        arr.push({ id: l.id, nombre: l.nombre, destinoId: l.destino_id, tipo: "gastronomico" });
      }
    }
    respsByPerfil.set(r.perfil_id, arr);
  }

  const rows: ResponsableListRow[] = [];
  for (const p of perfiles) {
    let entidades = respsByPerfil.get(p.id) ?? [];

    // Scope: admin local solo ve responsables con al menos una entidad en su destino.
    // Los "sueltos" (sin entidades) solo los ve el super admin.
    if (!me.isSuperAdmin) {
      if (entidades.length === 0) continue;
      const hasInScope = entidades.some((e) => e.destinoId === me.destinoId);
      if (!hasInScope) continue;
      // Recortamos a las entidades de SU destino: el admin local no debe ver
      // (ni recibir en el payload) las que el responsable tenga en otros
      // destinos. Como el row solo expone vínculos in-scope, mostrar su email
      // es legítimo (gestiona ese negocio en este destino).
      entidades = entidades.filter((e) => e.destinoId === me.destinoId);
    }

    const { data: u } = await sb.auth.admin.getUserById(p.id);
    rows.push({
      id: p.id,
      nombre: p.nombre,
      email: u?.user?.email ?? "(sin email)",
      entidades,
      createdAt: p.created_at,
      isAlsoAdmin: p.rol === "admin",
      isSuperAdmin: p.rol === "admin" && p.destino_id == null,
    });
  }
  return rows;
}

/**
 * Lista entidades (hospedajes + gastronómicos) que el admin actual puede
 * asignar a un responsable.
 *
 * Filtra las que ya tienen un responsable asignado: 1 entidad = 1 responsable.
 * Para reasignar hay que desvincular al responsable actual primero desde
 * la lista de responsables.
 *
 * Para el flow de edit, opts.incluirIds permite incluir entidades del
 * responsable actual aunque estén "asignadas" (lo están a él mismo) para
 * que aparezcan tildadas y no se le pierdan al editar.
 */
export async function listEntidadesAsignables(
  opts: { incluirIds?: string[] } = {}
): Promise<EntidadAsignable[]> {
  const me = await requireAdmin();
  const sb = createAdminClient();
  const incluir = new Set(opts.incluirIds ?? []);

  // 1) Hospedajes (scoped por destino si admin local).
  let qH = sb
    .from("hospedajes")
    .select("id, nombre, destino_id, destinos!inner(nombre)")
    .order("nombre");
  if (!me.isSuperAdmin) qH = qH.eq("destino_id", me.destinoId!);
  const { data: hosps } = await qH.returns<
    Array<{
      id: string;
      nombre: string;
      destino_id: string;
      destinos: { nombre: string };
    }>
  >();

  // 2) Lugares gastronómicos (scoped por destino si admin local).
  let qL = sb
    .from("lugares")
    .select("id, nombre, destino_id, destinos!inner(nombre)")
    .eq("tipo", "gastronomico")
    .order("nombre");
  if (!me.isSuperAdmin) qL = qL.eq("destino_id", me.destinoId!);
  const { data: lugs } = await qL.returns<
    Array<{
      id: string;
      nombre: string;
      destino_id: string;
      destinos: { nombre: string };
    }>
  >();

  // 3) Responsabilidades existentes (de TODOS los responsables, sin scope —
  //    necesitamos saber qué entidad ya está tomada aunque sea por uno fuera
  //    del scope del admin local, para no asignar duplicado).
  const { data: resps } = await sb
    .from("responsabilidades")
    .select("entidad_tipo, entidad_id")
    .returns<Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }>>();
  const ocupadasHospedaje = new Set(
    (resps ?? []).filter((r) => r.entidad_tipo === "hospedaje").map((r) => r.entidad_id)
  );
  const ocupadasLugar = new Set(
    (resps ?? []).filter((r) => r.entidad_tipo === "lugar").map((r) => r.entidad_id)
  );

  const out: EntidadAsignable[] = [];
  for (const h of hosps ?? []) {
    if (ocupadasHospedaje.has(h.id) && !incluir.has(h.id)) continue;
    out.push({
      tipo: "hospedaje",
      id: h.id,
      nombre: h.nombre,
      destinoId: h.destino_id,
      destinoNombre: h.destinos.nombre,
    });
  }
  for (const l of lugs ?? []) {
    if (ocupadasLugar.has(l.id) && !incluir.has(l.id)) continue;
    out.push({
      tipo: "gastronomico",
      id: l.id,
      nombre: l.nombre,
      destinoId: l.destino_id,
      destinoNombre: l.destinos.nombre,
    });
  }
  return out;
}

const entidadRefSchema = z.object({
  tipo: z.enum(["hospedaje", "gastronomico"]),
  id: z.string().uuid(),
});

const createResponsableSchema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(2, "Nombre requerido").max(120),
  // Se permite arreglo vacío (invite "suelto" — asignar entidades después).
  entidades: z.array(entidadRefSchema).default([]),
});

export interface CreateResponsableResult extends ActionResult {
  /** Email al que se envió la invitación o al que se le sumaron entidades. */
  email?: string;
  /** true si el email ya existía y se sumaron entidades a su cuenta. */
  merged?: boolean;
  /** Cantidad de entidades nuevas sumadas (solo en caso merged). */
  mergedCount?: number;
}

/**
 * Busca un user en auth.users por email iterando listUsers.
 * Devuelve null si no existe. Tolera hasta 50 páginas de 200 (10k users).
 */
async function findAuthUserByEmail(
  sb: ReturnType<typeof createAdminClient>,
  email: string
): Promise<{ id: string; email: string } | null> {
  const target = email.toLowerCase().trim();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found && found.email) return { id: found.id, email: found.email };
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Crea un responsable nuevo + lo vincula a 0 o más entidades (hospedajes y/o
 * gastronómicos) y le manda invitación por email para activar su cuenta.
 *
 * Scope: admin local solo puede asignar entidades de su destino. Super
 * admin puede asignar de cualquier destino.
 *
 * Regla: 1 entidad = 1 responsable. Si alguna entidad ya tiene responsable
 * asignado, el action rechaza la operación entera (no se invita) — el admin
 * tiene que desvincular al responsable anterior primero.
 *
 * No genera password — el invitado define el suyo desde el link del mail.
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

  const { email, nombre, entidades } = parsed.data;
  const sb = createAdminClient();

  const hospedajeIds = entidades.filter((e) => e.tipo === "hospedaje").map((e) => e.id);
  const lugarIds = entidades.filter((e) => e.tipo === "gastronomico").map((e) => e.id);

  // Validar scope + existencia de hospedajes.
  if (hospedajeIds.length > 0) {
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
  }

  // Validar scope + existencia de lugares.
  if (lugarIds.length > 0) {
    const { data: lugares } = await sb
      .from("lugares")
      .select("id, destino_id, tipo")
      .in("id", lugarIds)
      .returns<Array<{ id: string; destino_id: string; tipo: string }>>();
    if (!lugares || lugares.length !== lugarIds.length) {
      return { error: "Alguno de los gastronómicos seleccionados no existe." };
    }
    const noGastro = lugares.find((l) => l.tipo !== "gastronomico");
    if (noGastro) {
      return { error: "Solo se pueden asignar lugares de tipo gastronómico." };
    }
    if (!me.isSuperAdmin) {
      const fueraScope = lugares.find((l) => l.destino_id !== me.destinoId);
      if (fueraScope) {
        return { error: "No podés asignar gastronómicos de otro destino." };
      }
    }
  }

  // Pre-chequear si el email ya tiene cuenta — para soportar invite-merge
  // (operador con varios negocios: hospedaje + gastronómico, o que ya es
  // admin local). Si existe, NO reinvitamos (evita reenviarle mail de
  // activación a alguien con cuenta activa) y sumamos a sus responsabilidades.
  const existingAuthUser = await findAuthUserByEmail(sb, email);

  let existingPerfil: { id: string; rol: string } | null = null;
  if (existingAuthUser) {
    const { data } = await sb
      .from("perfiles")
      .select("id, rol")
      .eq("id", existingAuthUser.id)
      .maybeSingle<{ id: string; rol: string }>();
    existingPerfil = data;
  }

  // Validar 1 entidad = 1 responsable — excluyendo responsabilidades del
  // perfil que estamos por mergear (esas YA son suyas, no son conflicto).
  if (entidades.length > 0) {
    let q = sb
      .from("responsabilidades")
      .select("entidad_tipo, entidad_id, perfil_id")
      .or(
        [
          hospedajeIds.length > 0
            ? `and(entidad_tipo.eq.hospedaje,entidad_id.in.(${hospedajeIds.join(",")}))`
            : null,
          lugarIds.length > 0
            ? `and(entidad_tipo.eq.lugar,entidad_id.in.(${lugarIds.join(",")}))`
            : null,
        ]
          .filter(Boolean)
          .join(",")
      );
    if (existingPerfil) q = q.neq("perfil_id", existingPerfil.id);
    const { data: yaAsignadas } = await q.returns<
      Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }>
    >();
    if (yaAsignadas && yaAsignadas.length > 0) {
      return {
        error:
          "Una o más entidades ya tienen responsable asignado. Desvinculá al responsable actual antes de asignar a otro.",
      };
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.misescapadas.com.ar";

  // Bifurcamos: usuario nuevo → invitar (manda mail). Usuario existente →
  // merge (NO reinvitar, NO reenviar mail).
  let userId: string;
  let merged = false;

  if (existingAuthUser) {
    userId = existingAuthUser.id;
    merged = true;

    if (existingPerfil) {
      if (existingPerfil.rol === "admin") {
        // Caso operador-admin-local que también gestiona entidades: NO
        // cambiamos rol (sigue siendo admin). Solo sumamos responsabilidades.
        // Caveat: con el alcance mínimo no podrá gestionar estas entidades
        // desde /panel — ver [[project-roles-multiples]] para el rediseño
        // completo de auth helpers.
      } else if (existingPerfil.rol === "responsable") {
        // Mergear: actualizar nombre + unión de hospedajes_ids.
        const { data: perfilFull } = await sb
          .from("perfiles")
          .select("hospedajes_ids")
          .eq("id", userId)
          .maybeSingle<{ hospedajes_ids: string[] | null }>();
        const mergedHospedajeIds = Array.from(
          new Set([...(perfilFull?.hospedajes_ids ?? []), ...hospedajeIds])
        );
        const { error: updErr } = await sb
          .from("perfiles")
          .update({
            nombre,
            hospedajes_ids: mergedHospedajeIds,
          } as never)
          .eq("id", userId);
        if (updErr) {
          return { error: `Falló actualizar el perfil: ${updErr.message}` };
        }
      } else {
        // Otro rol → upgrade a responsable.
        const { error: updErr } = await sb
          .from("perfiles")
          .update({
            nombre,
            rol: "responsable",
            hospedajes_ids: hospedajeIds,
          } as never)
          .eq("id", userId);
        if (updErr) {
          return { error: `Falló actualizar el perfil: ${updErr.message}` };
        }
      }
    } else {
      // auth.user existe pero NO tiene perfil. Crear perfil como responsable.
      const { error: perfilErr } = await sb.from("perfiles").insert({
        id: userId,
        nombre,
        rol: "responsable",
        hospedajes_ids: hospedajeIds,
      } as never);
      if (perfilErr) {
        return { error: `Falló crear el perfil: ${perfilErr.message}` };
      }
    }
  } else {
    // Usuario nuevo: invitar (manda mail con link de activación).
    const { data: invited, error: inviteErr } =
      await sb.auth.admin.inviteUserByEmail(email, {
        data: { nombre },
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
      });
    if (inviteErr || !invited.user) {
      return {
        error: inviteErr?.message ?? "No se pudo enviar la invitación.",
      };
    }
    userId = invited.user.id;

    const { error: perfilErr } = await sb.from("perfiles").insert({
      id: userId,
      nombre,
      rol: "responsable",
      hospedajes_ids: hospedajeIds,
    } as never);
    if (perfilErr) {
      // No borramos el auth.user: el invite ya se mandó. El admin puede
      // reintentar — el flow ahora caerá en el branch "existente sin perfil".
      return {
        error: `Invitación enviada pero falló el perfil: ${perfilErr.message}`,
      };
    }
  }

  // Poblar responsabilidades (idempotente — upsert con ignoreDuplicates).
  const respRows = [
    ...hospedajeIds.map((id) => ({
      perfil_id: userId,
      entidad_tipo: "hospedaje" as const,
      entidad_id: id,
    })),
    ...lugarIds.map((id) => ({
      perfil_id: userId,
      entidad_tipo: "lugar" as const,
      entidad_id: id,
    })),
  ];
  if (respRows.length > 0) {
    await sb
      .from("responsabilidades")
      .upsert(respRows as never, {
        onConflict: "perfil_id,entidad_tipo,entidad_id",
        ignoreDuplicates: true,
      });
  }

  revalidatePath("/admin/responsables");
  return {
    ok: true,
    email,
    merged,
    mergedCount: merged ? entidades.length : undefined,
  };
}

const updateResponsableSchema = z.object({
  responsableId: z.string().uuid(),
  nombre: z.string().trim().min(2, "Nombre requerido").max(120),
  entidades: z.array(entidadRefSchema).default([]),
});

/**
 * Actualiza nombre + entidades asignadas (hospedajes + gastronómicos) de un
 * responsable. El email NO se modifica desde acá.
 *
 * Scope:
 *  - Admin local solo puede modificar si TODAS las entidades actuales y
 *    nuevas del responsable están en su destino.
 *  - Regla 1 entidad = 1 responsable se valida sobre las entidades NUEVAS
 *    (las que se están agregando ahora — las que ya tenía el responsable
 *    obviamente están tomadas por él mismo, eso está OK).
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
    .select("id, rol")
    .eq("id", parsed.data.responsableId)
    .maybeSingle<{ id: string; rol: string }>();
  if (!perfil || perfil.rol !== "responsable") {
    return { error: "El responsable no existe." };
  }

  // Responsabilidades actuales del responsable.
  const { data: actuales } = await sb
    .from("responsabilidades")
    .select("entidad_tipo, entidad_id")
    .eq("perfil_id", parsed.data.responsableId)
    .returns<Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }>>();

  const actualesSet = new Set(
    (actuales ?? []).map((r) => `${r.entidad_tipo}:${r.entidad_id}`)
  );

  const hospedajeIds = parsed.data.entidades.filter((e) => e.tipo === "hospedaje").map((e) => e.id);
  const lugarIds = parsed.data.entidades.filter((e) => e.tipo === "gastronomico").map((e) => e.id);

  // Scope admin local: TODAS las entidades (actuales + nuevas) deben estar en su destino.
  if (!me.isSuperAdmin) {
    if (hospedajeIds.length > 0) {
      const { data: hosps } = await sb
        .from("hospedajes")
        .select("id, destino_id")
        .in("id", hospedajeIds)
        .returns<Array<{ id: string; destino_id: string }>>();
      const fuera = (hosps ?? []).find((h) => h.destino_id !== me.destinoId);
      if (fuera) {
        return {
          error: "No podés asignar hospedajes de otro destino.",
        };
      }
    }
    if (lugarIds.length > 0) {
      const { data: lugs } = await sb
        .from("lugares")
        .select("id, destino_id, tipo")
        .in("id", lugarIds)
        .returns<Array<{ id: string; destino_id: string; tipo: string }>>();
      const fuera = (lugs ?? []).find((l) => l.destino_id !== me.destinoId);
      if (fuera) {
        return { error: "No podés asignar gastronómicos de otro destino." };
      }
      const noGastro = (lugs ?? []).find((l) => l.tipo !== "gastronomico");
      if (noGastro) {
        return { error: "Solo se pueden asignar lugares de tipo gastronómico." };
      }
    }

    // Verificar que las entidades ACTUALES también estén en scope.
    const actualesHospedaje = (actuales ?? [])
      .filter((r) => r.entidad_tipo === "hospedaje")
      .map((r) => r.entidad_id);
    const actualesLugar = (actuales ?? [])
      .filter((r) => r.entidad_tipo === "lugar")
      .map((r) => r.entidad_id);
    if (actualesHospedaje.length > 0) {
      const { data } = await sb
        .from("hospedajes")
        .select("id, destino_id")
        .in("id", actualesHospedaje)
        .returns<Array<{ id: string; destino_id: string }>>();
      if ((data ?? []).some((h) => h.destino_id !== me.destinoId)) {
        return {
          error:
            "Este responsable tiene entidades fuera de tu destino. Solo super admin puede modificarlo.",
        };
      }
    }
    if (actualesLugar.length > 0) {
      const { data } = await sb
        .from("lugares")
        .select("id, destino_id")
        .in("id", actualesLugar)
        .returns<Array<{ id: string; destino_id: string }>>();
      if ((data ?? []).some((l) => l.destino_id !== me.destinoId)) {
        return {
          error:
            "Este responsable tiene entidades fuera de tu destino. Solo super admin puede modificarlo.",
        };
      }
    }
  }

  // Validar 1 entidad = 1 responsable sobre las entidades NUEVAS (las que
  // no tenía ya este responsable). Otras suyas están OK.
  const nuevasHospedaje = hospedajeIds.filter((id) => !actualesSet.has(`hospedaje:${id}`));
  const nuevosLugar = lugarIds.filter((id) => !actualesSet.has(`lugar:${id}`));
  if (nuevasHospedaje.length > 0 || nuevosLugar.length > 0) {
    const { data: ocupadas } = await sb
      .from("responsabilidades")
      .select("entidad_tipo, entidad_id, perfil_id")
      .or(
        [
          nuevasHospedaje.length > 0
            ? `and(entidad_tipo.eq.hospedaje,entidad_id.in.(${nuevasHospedaje.join(",")}))`
            : null,
          nuevosLugar.length > 0
            ? `and(entidad_tipo.eq.lugar,entidad_id.in.(${nuevosLugar.join(",")}))`
            : null,
        ]
          .filter(Boolean)
          .join(",")
      )
      .neq("perfil_id", parsed.data.responsableId)
      .returns<Array<{ entidad_tipo: string; entidad_id: string; perfil_id: string }>>();
    if (ocupadas && ocupadas.length > 0) {
      return {
        error:
          "Una o más entidades ya tienen responsable asignado. Desvinculalas primero.",
      };
    }
  }

  // Actualizar nombre + hospedajes_ids (compat) en perfiles.
  const { error: updErr } = await sb
    .from("perfiles")
    .update({
      nombre: parsed.data.nombre,
      hospedajes_ids: hospedajeIds,
    } as never)
    .eq("id", parsed.data.responsableId);
  if (updErr) return { error: updErr.message };

  // Reemplazar responsabilidades: borrar las actuales y reinsertar.
  const { error: delErr } = await sb
    .from("responsabilidades")
    .delete()
    .eq("perfil_id", parsed.data.responsableId);
  if (delErr) return { error: delErr.message };

  const respRows = [
    ...hospedajeIds.map((id) => ({
      perfil_id: parsed.data.responsableId,
      entidad_tipo: "hospedaje" as const,
      entidad_id: id,
    })),
    ...lugarIds.map((id) => ({
      perfil_id: parsed.data.responsableId,
      entidad_tipo: "lugar" as const,
      entidad_id: id,
    })),
  ];
  if (respRows.length > 0) {
    const { error: insErr } = await sb.from("responsabilidades").insert(respRows as never);
    if (insErr) return { error: insErr.message };
  }

  revalidatePath("/admin/responsables");
  return { ok: true };
}

/**
 * Borra un responsable (perfil + user de auth + responsabilidades por
 * cascada de FK). Las consultas vinculadas a sus entidades quedan en la BD.
 *
 * Scope: idem updateResponsableAction — admin local solo si todas las
 * entidades del responsable son de su destino.
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
    .select("id, rol")
    .eq("id", responsableId)
    .maybeSingle<{ id: string; rol: string }>();
  if (!perfil || perfil.rol !== "responsable") {
    return { error: "El responsable no existe." };
  }

  if (!me.isSuperAdmin) {
    const { data: actuales } = await sb
      .from("responsabilidades")
      .select("entidad_tipo, entidad_id")
      .eq("perfil_id", responsableId)
      .returns<Array<{ entidad_tipo: "hospedaje" | "lugar"; entidad_id: string }>>();
    const hospIds = (actuales ?? []).filter((r) => r.entidad_tipo === "hospedaje").map((r) => r.entidad_id);
    const lugIds = (actuales ?? []).filter((r) => r.entidad_tipo === "lugar").map((r) => r.entidad_id);
    if (hospIds.length > 0) {
      const { data } = await sb
        .from("hospedajes")
        .select("id, destino_id")
        .in("id", hospIds)
        .returns<Array<{ destino_id: string }>>();
      if ((data ?? []).some((h) => h.destino_id !== me.destinoId)) {
        return {
          error:
            "Este responsable tiene entidades en otro destino. Solo super admin puede borrarlo.",
        };
      }
    }
    if (lugIds.length > 0) {
      const { data } = await sb
        .from("lugares")
        .select("id, destino_id")
        .in("id", lugIds)
        .returns<Array<{ destino_id: string }>>();
      if ((data ?? []).some((l) => l.destino_id !== me.destinoId)) {
        return {
          error:
            "Este responsable tiene entidades en otro destino. Solo super admin puede borrarlo.",
        };
      }
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

/**
 * Tipo legacy mantenido por compatibilidad con imports existentes
 * (algunos archivos lo importan). Equivalente a EntidadAsignable para
 * tipo='hospedaje'.
 *
 * @deprecated Usar EntidadAsignable.
 */
export type HospedajeOption = EntidadAsignable;
