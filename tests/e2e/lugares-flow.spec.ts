import { test, expect, type Page } from "@playwright/test";
import { loginResponsable, loginAdmin } from "../helpers/auth";
import { cleanupTestLugares } from "../helpers/cleanup";

// Flujo comercial de "lugares" (gastronómico y "qué hacer"): el responsable
// carga → envía a validación → el admin local aprueba → se ve en el sitio.
// Espeja el golden-path de hospedajes; valida la paridad de "qué hacer" (la cola
// de validación incluida en #50) y de gastronomía.

const PREFIX = "test-e2e-lugar-";

type Caso = {
  tipo: "gastronomico" | "atractivo";
  vertical: "gastronomia" | "atractivos"; // segmento de ruta pública
  etiqueta: string;
};

const CASOS: Caso[] = [
  { tipo: "gastronomico", vertical: "gastronomia", etiqueta: "Gastronómico" },
  { tipo: "atractivo", vertical: "atractivos", etiqueta: "Qué hacer" },
];

async function elegirDestinoLasGaviotas(page: Page) {
  const sel = page.locator('select[name="destino_id"]');
  if ((await sel.count()) === 0) return;
  const opts = sel.locator("option");
  const n = await opts.count();
  for (let i = 0; i < n; i++) {
    const txt = (await opts.nth(i).textContent())?.toLowerCase() ?? "";
    if (txt.includes("gaviotas")) {
      await sel.selectOption(await opts.nth(i).getAttribute("value") ?? { index: i });
      return;
    }
  }
  if (n > 1) await sel.selectOption({ index: 1 });
}

for (const caso of CASOS) {
  test.describe.serial(`Lugar E2E (${caso.etiqueta}): responsable → admin aprueba → público`, () => {
    const TS = `${Date.now()}-${caso.tipo}`;
    const SLUG = `${PREFIX}${TS}`;
    const NOMBRE = `Test E2E ${caso.etiqueta} ${TS}`;

    test.beforeAll(async () => {
      await cleanupTestLugares(PREFIX);
    });
    test.afterAll(async () => {
      await cleanupTestLugares(PREFIX);
    });

    test(`responsable: crear ${caso.etiqueta} → enviar a validación`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await loginResponsable(page);
      await expect(page).toHaveURL(/\/panel/);

      // Saltamos el selector de tipo yendo directo con ?tipo=
      await page.goto(`/panel/lugares/nuevo?tipo=${caso.tipo}`);

      await elegirDestinoLasGaviotas(page);
      // Categoría: primer valor real (índice 1; el 0 suele ser placeholder).
      await page.locator('select[name="categoria"]').selectOption({ index: 1 });
      await page.locator('input[name="nombre"]').fill(NOMBRE);
      await page.locator('input[name="slug"]').fill(SLUG);
      await page
        .locator('textarea[name="descripcion_corta"]')
        .fill("Local de prueba E2E para validar el flujo completo del sistema.");
      // WhatsApp: obligatorio en gastronómico, opcional en qué hacer (lo damos igual).
      await page.locator('input[name="whatsapp"]').fill("+5492257111111");

      await page.getByRole("button", { name: /crear/i }).click();
      // Esperar el redirect a la ficha del lugar nuevo (un id UUID, NO "nuevo").
      // El regex viejo /lugares/[^/]+$ matcheaba /lugares/nuevo?tipo=... y
      // resolvía al instante, sin esperar de verdad a que el create redirija.
      await page.waitForURL(/\/panel\/lugares\/[0-9a-f]{8}-[0-9a-f-]+/, {
        timeout: 30_000,
        waitUntil: "commit",
      });

      // No debe aparecer error de RLS (regresión de la migración de responsable).
      await expect(page.getByText(/row-level security/i)).toHaveCount(0);

      // A diferencia de hospedajes (borrador → "Enviar a validación"), el lugar
      // creado por un responsable va DIRECTO a pendiente_validacion. Verificamos
      // que quedó en revisión.
      await expect(page.getByText(/pendiente de revisi/i)).toBeVisible({
        timeout: 10_000,
      });
    });

    test(`admin: aprobar ${caso.etiqueta} pendiente`, async ({ page }) => {
      await loginAdmin(page);
      await expect(page).toHaveURL(/\/admin(?!\/login)/);

      await page.goto("/admin/validaciones");
      const card = page.locator("article").filter({ hasText: NOMBRE });
      await expect(card).toBeVisible({ timeout: 15_000 });

      await card.getByRole("button", { name: /aprobar y publicar/i }).click();
      await expect(card).not.toBeVisible({ timeout: 15_000 });
    });

    test(`público: ${caso.etiqueta} publicado visible`, async ({ page }) => {
      await page.goto(`/las-gaviotas/${caso.vertical}/${SLUG}`);
      await expect(page.getByRole("heading", { name: NOMBRE })).toBeVisible({
        timeout: 15_000,
      });
    });
  });
}
