import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // .env.local optional para algunos comandos; los helpers tirarán error si faltan vars
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // Tests comparten DB; secuencial es más predecible.
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results",
  // Timeouts holgados: en `next dev` la 1ª visita a cada ruta la compila
  // on-demand y eso puede tardar bastante (sobre todo en frío). Sin esto,
  // el primer test que toca una ruta nueva revienta por timeout aunque la
  // app esté sana. Si se corre contra `npm run build && npm start` sobra,
  // pero no molesta.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
