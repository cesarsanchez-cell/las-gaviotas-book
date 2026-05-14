// Crea un usuario responsable pre-confirmado para testing E2E.
// Uso:
//   node --env-file=.env.local scripts/seed-test-responsable.mjs
//   node --env-file=.env.local scripts/seed-test-responsable.mjs <email> <password> <nombre>
//
// Defaults: responsable1@test.com / Test1234! / "Responsable Uno"

import { createClient } from "@supabase/supabase-js";

const [, , emailArg, passwordArg, ...nombreParts] = process.argv;
const email = emailArg ?? "responsable1@test.com";
const password = passwordArg ?? "Test1234!";
const nombre = nombreParts.length ? nombreParts.join(" ") : "Responsable Uno";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\n=== Creando responsable de testing ===`);
console.log(`  email:    ${email}`);
console.log(`  password: ${password}`);
console.log(`  nombre:   ${nombre}\n`);

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre },
});

let userId = created?.user?.id;

if (createErr) {
  if (
    createErr.message?.toLowerCase().includes("already") ||
    createErr.status === 422 ||
    createErr.code === "email_exists"
  ) {
    console.log(`ℹ️  Usuario ya existía. Buscando id…`);
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      perPage: 200,
    });
    if (listErr) {
      console.error("❌ Error listando usuarios:", listErr.message);
      process.exit(1);
    }
    const match = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!match) {
      console.error("❌ No pude encontrar el usuario por email.");
      process.exit(1);
    }
    userId = match.id;
  } else {
    console.error("❌ Error creando usuario:", createErr.message);
    process.exit(1);
  }
} else {
  console.log(`✅ Auth user creado — id=${userId}`);
}

const { data: existingPerfil } = await admin
  .from("perfiles")
  .select("id, rol, nombre")
  .eq("id", userId)
  .maybeSingle();

if (existingPerfil) {
  console.log(`ℹ️  Perfil ya existía — rol=${existingPerfil.rol}, nombre="${existingPerfil.nombre}"`);
} else {
  const { error: perfilErr } = await admin
    .from("perfiles")
    .insert({ id: userId, nombre, rol: "responsable" });
  if (perfilErr) {
    console.error("❌ Error creando perfil:", perfilErr.message);
    process.exit(1);
  }
  console.log(`✅ Perfil creado con rol=responsable`);
}

console.log(`\n🎉 Listo. Login en http://localhost:3005/login`);
console.log(`   email:    ${email}`);
console.log(`   password: ${password}\n`);
