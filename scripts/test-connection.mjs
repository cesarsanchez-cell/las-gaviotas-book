// Script de diagnóstico — chequea conexión a Supabase y la query del destino.
// Uso: node --env-file=.env.local scripts/test-connection.mjs
// No imprime keys.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("=== ENV CHECK ===");
console.log("NEXT_PUBLIC_SUPABASE_URL:", url ? `set (${url.split(".")[0].replace(/.*\//, "").slice(0, 8)}...)` : "MISSING");
console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", anon ? `set (length ${anon.length})` : "MISSING");
console.log("SUPABASE_SERVICE_ROLE_KEY:", service ? `set (length ${service.length})` : "MISSING");

if (!url || !anon) {
  console.error("\n❌ Faltan variables de entorno. Verificar .env.local");
  process.exit(1);
}

console.log("\n=== TEST CON ANON KEY (igual que el front público) ===");
const supabase = createClient(url, anon);

const { data: destinos, error: e1, status: s1 } = await supabase
  .from("destinos")
  .select("slug, nombre, activo")
  .limit(5);

console.log("Query destinos:");
console.log("  Status:", s1);
console.log("  Error:", e1 ? `${e1.code} ${e1.message}` : "none");
console.log("  Rows:", destinos?.length ?? 0);
if (destinos?.length) {
  destinos.forEach((d) => console.log(`    - slug=${d.slug} | nombre=${d.nombre} | activo=${d.activo}`));
}

const { data: lg, error: e2 } = await supabase
  .from("destinos")
  .select("*")
  .eq("slug", "las-gaviotas")
  .eq("activo", true)
  .maybeSingle();

console.log("\nQuery destino slug='las-gaviotas' activo=true:");
console.log("  Error:", e2 ? `${e2.code} ${e2.message}` : "none");
console.log("  Found:", lg ? `YES (id=${lg.id})` : "NO");

const { data: hosp, error: e3 } = await supabase
  .from("hospedajes")
  .select("slug, nombre, estado")
  .limit(5);

console.log("\nQuery hospedajes:");
console.log("  Error:", e3 ? `${e3.code} ${e3.message}` : "none");
console.log("  Rows:", hosp?.length ?? 0);
if (hosp?.length) {
  hosp.forEach((h) => console.log(`    - slug=${h.slug} | nombre=${h.nombre} | estado=${h.estado}`));
}
