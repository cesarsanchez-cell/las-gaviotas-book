// Runner secuencial de la suite E2E.
//
// Corre CADA spec en su propio proceso `playwright test`. En `next dev` un único
// proceso largo (los 19 tests de un saque, ~8 min) degrada el dev server
// (compile on-demand + memoria) y aparecen flakes de timeout. Invocando spec por
// spec, cada corrida es corta y el server respira entre archivos → verde estable.
//
// Para correr todo en un solo proceso (CI con build de prod, por ejemplo):
//   npx playwright test
//
// Uso: npm run test:e2e   (o: node tests/run-e2e.mjs)

import { spawnSync } from "node:child_process";

// Orden: primero los livianos / read-only, después los pesados de carga+admin.
const SPECS = [
  "consulta.spec.ts",
  "edge-cases.spec.ts",
  "golden-path.spec.ts",
  "lugares-flow.spec.ts",
];

const results = [];
for (const spec of SPECS) {
  console.log(`\n======== ${spec} ========`);
  const r = spawnSync(
    "npx",
    ["playwright", "test", spec, "--reporter=line"],
    { stdio: "inherit", shell: true, env: process.env }
  );
  results.push({ spec, code: r.status ?? 1 });
}

console.log("\n======== RESUMEN ========");
let failed = 0;
for (const { spec, code } of results) {
  const ok = code === 0;
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"}  ${spec}`);
}
if (failed) {
  console.log(`\n${failed} spec(s) con fallos.`);
  process.exit(1);
}
console.log("\nTodos los specs en verde. 🎉");
