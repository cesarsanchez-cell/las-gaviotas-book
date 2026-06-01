// Auditoría Etapa 4 (F-S1): ¿un cliente ANÓNIMO puede enumerar el bucket
// `hospedajes` con list()? Read-only. Borrar este script tras correrlo.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Parseo mínimo de .env.local (sin dependencias).
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("URL:", url ? "ok" : "FALTA", "| anon key:", anon ? "ok" : "FALTA");

// Cliente ANÓNIMO (sin sesión) — exactamente lo que tiene un visitante.
const sb = createClient(url, anon, { auth: { persistSession: false } });

async function probe(prefix) {
  const { data, error } = await sb.storage
    .from("hospedajes")
    .list(prefix, { limit: 100 });
  if (error) {
    console.log(`list(${JSON.stringify(prefix)}) -> ERROR: ${error.message}`);
    return [];
  }
  const names = (data ?? []).map((o) => o.name);
  console.log(`list(${JSON.stringify(prefix)}) -> ${names.length} entradas:`, names.slice(0, 20));
  return names;
}

console.log("\n=== Enumeración como ANÓNIMO ===");
const root = await probe("");                 // raíz: ¿lista carpetas (uuids + unidad-types + lugares)?
if (root.length) {
  const first = root.find((n) => n !== "unidad-types" && n !== "lugares") ?? root[0];
  await probe(first);                          // dentro de una carpeta: ¿lista los blobs?
}
await probe("lugares");

console.log(
  "\nVEREDICTO: si las llamadas de arriba devolvieron entradas, un ANÓNIMO puede",
  "enumerar el bucket -> F-S1 es NO-GO (enumeración cross-tenant). Si todas dieron",
  "0 entradas o ERROR, list() está cerrado -> F-S1 baja a Major (solo GET por path conocido)."
);
