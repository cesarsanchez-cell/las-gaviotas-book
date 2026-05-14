// Crea un usuario admin pre-confirmado para testing E2E.
// Uso: node --use-system-ca --env-file=.env.local scripts/seed-test-admin.mjs

import { createClient } from "@supabase/supabase-js";

const email = "admin.test@test.com";
const password = "TestAdmin1234!";
const nombre = "Admin Tester";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("❌ Faltan vars de entorno");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { nombre },
});

let userId = created?.user?.id;
if (createErr) {
  if (
    createErr.code === "email_exists" ||
    createErr.message?.toLowerCase().includes("already")
  ) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const match = list.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!match) {
      console.error("❌ User existe pero no lo encontré");
      process.exit(1);
    }
    userId = match.id;
    console.log(`ℹ️  Auth user ya existía — id=${userId}`);
  } else {
    console.error("❌", createErr.message);
    process.exit(1);
  }
} else {
  console.log(`✅ Auth user creado — id=${userId}`);
}

const { data: existing } = await admin
  .from("perfiles")
  .select("id, rol")
  .eq("id", userId)
  .maybeSingle();

if (existing) {
  if (existing.rol !== "admin") {
    await admin.from("perfiles").update({ rol: "admin" }).eq("id", userId);
    console.log(`✅ Perfil actualizado a rol=admin`);
  } else {
    console.log(`ℹ️  Perfil ya era admin`);
  }
} else {
  await admin.from("perfiles").insert({ id: userId, nombre, rol: "admin" });
  console.log(`✅ Perfil creado con rol=admin`);
}

console.log(`\n🎉 Login en http://localhost:3005/admin/login`);
console.log(`   email:    ${email}`);
console.log(`   password: ${password}\n`);
