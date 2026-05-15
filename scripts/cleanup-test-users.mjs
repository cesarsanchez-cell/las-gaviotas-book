// Cleanup de users de testing en Supabase.
//
// USO:
//   node --use-system-ca --env-file=.env.local scripts/cleanup-test-users.mjs
//     → Lista todos los users marcando cuáles son TEST / PROTEGIDOS
//
//   node --use-system-ca --env-file=.env.local scripts/cleanup-test-users.mjs --delete <email>
//     → Borra ese user específico (+ sus hospedajes si es responsable + fotos en Storage)
//
//   node --use-system-ca --env-file=.env.local scripts/cleanup-test-users.mjs --delete-tests
//     → Borra TODOS los users que matcheen el patrón de test (mailinator, +test aliases, etc.)
//
// Los emails PROTECTED nunca se borran (admin de prod + users de Playwright).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Users que NUNCA se pueden borrar (admin de prod + Playwright fixtures).
const PROTECTED_EMAILS = [
  "cesarsanchez@postacangrejoapart.com.ar",
  "consultas@postacangrejoapart.com.ar",
  "responsable1@test.com",
  "responsable2@test.com",
  "admin.test@test.com",
];

// Patrones de email que se consideran TEST y se pueden borrar con --delete-tests.
const TEST_PATTERNS = [
  /@mailinator\.com$/i,
  /\+test\d*@/i,
  /\+final@/i,
  /\+lasgaviotas/i,
  /\+escapadas/i,
  /\+abc/i,
];

function isProtected(email) {
  return PROTECTED_EMAILS.includes((email || "").toLowerCase());
}

function isTestEmail(email) {
  if (!email) return false;
  if (isProtected(email)) return false;
  return TEST_PATTERNS.some((re) => re.test(email));
}

async function listUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  return data.users.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

async function getProfile(userId) {
  const { data } = await admin
    .from("perfiles")
    .select("rol, hospedajes_ids")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

async function deleteHospedaje(hospedajeId) {
  const { data: fotos } = await admin
    .from("hospedaje_fotos")
    .select("storage_path")
    .eq("hospedaje_id", hospedajeId);

  if (fotos?.length) {
    await admin.storage
      .from("hospedajes")
      .remove(fotos.map((f) => f.storage_path));
  }
  await admin.from("hospedajes").delete().eq("id", hospedajeId);
}

async function deleteUserByEmail(email) {
  const users = await listUsers();
  const user = users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    console.error(`✗ Usuario no encontrado: ${email}`);
    return false;
  }
  if (isProtected(email)) {
    console.error(`✗ NO se puede borrar (protegido): ${email}`);
    return false;
  }

  const profile = await getProfile(user.id);
  if (profile?.rol === "responsable" && profile.hospedajes_ids?.length) {
    console.log(
      `  ${email}: tiene ${profile.hospedajes_ids.length} hospedaje(s). Borrándolos...`
    );
    for (const hid of profile.hospedajes_ids) {
      try {
        await deleteHospedaje(hid);
        console.log(`    ✓ Hospedaje ${hid} borrado`);
      } catch (e) {
        console.error(`    ✗ Error borrando hospedaje ${hid}: ${e.message}`);
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`✗ Error borrando user ${email}: ${error.message}`);
    return false;
  }
  console.log(`✓ User borrado: ${email}`);
  return true;
}

const args = process.argv.slice(2);
const mode = args[0];

if (!mode || mode === "list" || mode === "--list") {
  const users = await listUsers();
  console.log(`\nTotal users en el proyecto: ${users.length}\n`);
  console.log(
    "Email".padEnd(48) +
      "Creado".padEnd(22) +
      "Confirm".padEnd(10) +
      "Tipo"
  );
  console.log("-".repeat(90));
  for (const u of users) {
    const confirmed = u.email_confirmed_at ? "  ✓" : "  ✗";
    const tag = isProtected(u.email)
      ? "PROTEGIDO"
      : isTestEmail(u.email)
        ? "TEST"
        : "-";
    console.log(
      (u.email || "(sin email)").padEnd(48) +
        new Date(u.created_at).toISOString().slice(0, 19).padEnd(22) +
        confirmed.padEnd(10) +
        tag
    );
  }
  console.log("\nUso:");
  console.log("  node --use-system-ca --env-file=.env.local scripts/cleanup-test-users.mjs --delete <email>");
  console.log("  node --use-system-ca --env-file=.env.local scripts/cleanup-test-users.mjs --delete-tests");
} else if (mode === "--delete") {
  const email = args[1];
  if (!email) {
    console.error("Falta email. Uso: --delete <email>");
    process.exit(1);
  }
  await deleteUserByEmail(email);
} else if (mode === "--delete-tests") {
  const users = await listUsers();
  const targets = users.filter((u) => isTestEmail(u.email));
  if (targets.length === 0) {
    console.log("No hay users de test para borrar.");
    process.exit(0);
  }
  console.log(`\nVoy a borrar ${targets.length} user(s) detectados como TEST:\n`);
  for (const u of targets) console.log(`  - ${u.email}`);
  console.log("");
  for (const u of targets) {
    await deleteUserByEmail(u.email);
  }
  console.log(`\n✓ Cleanup completo. ${targets.length} user(s) procesados.`);
} else {
  console.error(
    `Modo desconocido: ${mode}\nUsá: (vacío) | list | --delete <email> | --delete-tests`
  );
  process.exit(1);
}
