// Lista users de auth y/o confirma manualmente un email pendiente.
// Uso:
//   node --use-system-ca --env-file=.env.local scripts/confirm-user.mjs
//     → lista todos los users con su estado de confirmación
//   node --use-system-ca --env-file=.env.local scripts/confirm-user.mjs <email>
//     → confirma manualmente ese email (sirve cuando Supabase rate-limiteó el mailer)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const emailArg = process.argv[2]?.toLowerCase();

const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 200 });
if (error) {
  console.error("❌", error.message);
  process.exit(1);
}

if (!emailArg) {
  console.log("\n=== Users en auth.users ===\n");
  for (const u of list.users) {
    const confirmed = u.email_confirmed_at ? "✅ confirmado" : "⏳ PENDIENTE";
    const date = new Date(u.created_at).toLocaleString("es-AR");
    console.log(`${confirmed}  ${u.email?.padEnd(40)}  creado ${date}`);
  }
  console.log(
    `\nPara confirmar uno: node --use-system-ca --env-file=.env.local scripts/confirm-user.mjs <email>\n`
  );
  process.exit(0);
}

const match = list.users.find((u) => u.email?.toLowerCase() === emailArg);
if (!match) {
  console.error(`❌ No encontré usuario con email "${emailArg}"`);
  process.exit(1);
}

if (match.email_confirmed_at) {
  console.log(`ℹ️  Ya estaba confirmado (${match.email_confirmed_at}).`);
  process.exit(0);
}

const { error: updErr } = await admin.auth.admin.updateUserById(match.id, {
  email_confirm: true,
});

if (updErr) {
  console.error("❌", updErr.message);
  process.exit(1);
}

console.log(`✅ ${match.email} confirmado. Ya podés loguear en /login.`);

// Si el user no tiene perfil, lo creo con rol responsable (caso típico de signup
// público que quedó a medio camino por rate limit).
const { data: perfil } = await admin
  .from("perfiles")
  .select("id, rol")
  .eq("id", match.id)
  .maybeSingle();

if (!perfil) {
  const nombre =
    (match.user_metadata?.nombre) ??
    match.email?.split("@")[0] ??
    "Sin nombre";
  await admin
    .from("perfiles")
    .insert({ id: match.id, nombre, rol: "responsable" });
  console.log(`✅ Perfil creado con rol=responsable (nombre="${nombre}")`);
}
