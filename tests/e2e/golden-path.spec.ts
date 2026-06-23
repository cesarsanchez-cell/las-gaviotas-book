import { test, expect, type Page } from "@playwright/test";
import { loginResponsable, loginAdmin, RESPONSABLE } from "../helpers/auth";
import { ensurePhotoFixtures } from "../helpers/fixtures";
import { cleanupTestHospedajes, resetResponsableHospedajes } from "../helpers/cleanup";

const SLUG_PREFIX = "test-e2e-";
const TS = Date.now();
const SLUG = `${SLUG_PREFIX}${TS}`;
const NOMBRE = `Test E2E Cabañas ${TS}`;

let photoPaths: string[] = [];
let hospedajeId = "";

test.beforeAll(async () => {
  photoPaths = await ensurePhotoFixtures(1);
  await cleanupTestHospedajes(SLUG_PREFIX);
  await resetResponsableHospedajes(RESPONSABLE.email);
});

test.afterAll(async () => {
  await cleanupTestHospedajes(SLUG_PREFIX);
  await resetResponsableHospedajes(RESPONSABLE.email);
});

test.describe.serial("Golden path E2E: responsable → admin aprueba → publicado", () => {
  // Combinamos G02–G06 en un solo test secuencial. Mantenemos el browser context
  // entre pasos (mismo `page`) para no perder sesión ni state intermedio.
  test("G02-G06 — responsable: login → crear → editar → fotos → submit", async ({ page }) => {
    test.setTimeout(180_000); // 5 uploads + checklist + submit puede tardar
    // G02
    await loginResponsable(page);
    await expect(page).toHaveURL(/\/panel/);

    // G03 — Crear hospedaje
    await page.goto("/panel/hospedajes/nuevo");

    await page.locator('input[name="nombre"]').fill(NOMBRE);
    await page.locator('input[name="slug"]').fill(SLUG);
    await page.locator('select[name="tipo"]').selectOption("cabana");

    // Destino Las Gaviotas: el admin que aprueba es admin LOCAL de ese destino,
    // así que el hospedaje tiene que caer ahí para aparecer en su cola.
    const destinoSelect = page.locator('select[name="destino_id"]');
    if (await destinoSelect.count()) {
      const opts = destinoSelect.locator("option");
      const n = await opts.count();
      for (let i = 0; i < n; i++) {
        const txt = (await opts.nth(i).textContent())?.toLowerCase() ?? "";
        if (txt.includes("gaviotas")) {
          await destinoSelect.selectOption(
            (await opts.nth(i).getAttribute("value")) ?? { index: i }
          );
          break;
        }
      }
    }

    const localidadSelect = page.locator('select[name="localidad_id"]');
    const localidadOptionsCount = await localidadSelect.locator("option").count();
    if (localidadOptionsCount > 1) {
      await localidadSelect.selectOption({ index: 1 });
    }

    await page.locator('textarea[name="descripcion_corta"]').fill(
      "Cabañas familiares a 3 cuadras del mar."
    );
    await page.locator('input[name="direccion"]').fill("Calle 42 entre 1 y 2");
    await page.locator('input[name="whatsapp"]').fill("+5492257111111");
    await page.locator('input[name="responsable_nombre"]').fill("Responsable Uno");

    await page.getByRole("button", { name: /crear hospedaje/i }).click();
    // Esperar el redirect a la ficha del hospedaje nuevo (id UUID, NO "nuevo").
    // El regex viejo /hospedajes/[^/]+$ matcheaba /hospedajes/nuevo y resolvía al
    // instante sin esperar de verdad al create.
    await page.waitForURL(/\/panel\/hospedajes\/[0-9a-f]{8}-[0-9a-f-]+/, {
      timeout: 30_000,
      waitUntil: "commit",
    });

    const match = page.url().match(/\/panel\/hospedajes\/([^/?#]+)/);
    expect(match).not.toBeNull();
    hospedajeId = match![1];

    await expect(page.getByText(/estado:\s*borrador/i)).toBeVisible();

    // G04 — agregar google maps url + lat/lng (regresión bug #001)
    await page.locator('input[name="google_maps_url"]').fill(
      "https://maps.app.goo.gl/abc123xyz"
    );
    await page.locator('input[name="lat"]').fill("-37.0500");
    await page.locator('input[name="lng"]').fill("-56.7500");

    // Completar resto del checklist mientras estamos en el form
    await page.locator('textarea[name="descripcion_larga"]').fill(
      "Cabañas familiares completamente equipadas a tres cuadras del mar, en una zona tranquila de Las Gaviotas. Cuentan con dos dormitorios, baño completo, cocina con vajilla, parrilla individual y cochera cubierta. Ideales para escapadas en pareja o familias. WiFi y aire acondicionado incluidos."
    );
    await page.locator('input[name="capacidad_min"]').fill("2");
    await page.locator('input[name="capacidad_max"]').fill("5");
    await page.locator('input[name="cantidad_unidades"]').fill("4");
    await page.locator('input[name="responsable_documento"]').fill("30123456");

    // Amenities (al menos 3) — son <label> con texto, click sobre el label togglea.
    // Amenities de PROPERTY (modelo 3-scopes); aire/cochera ahora son de unidad.
    await page.locator("label", { hasText: /^WiFi en áreas comunes$/ }).click();
    await page.locator("label", { hasText: /^Estacionamiento$/ }).click();
    await page.locator("label", { hasText: /^Piscina$/ }).click();

    await page.getByRole("button", { name: /guardar cambios/i }).click();

    // Verificar que NO aparece el error de RLS (regresión)
    await expect(page.getByText(/row-level security/i)).toHaveCount(0, {
      timeout: 8_000,
    });

    // Esperar que aparezca el mensaje de "Cambios guardados" o que el botón vuelva a estado normal
    await page.waitForLoadState("networkidle");

    // G05 — subir 1 foto (mínimo requerido). El input es hidden detrás del label "Subir fotos".
    await page.locator('input[type="file"][accept^="image"]').setInputFiles(photoPaths);

    // El componente actualiza state tras cada upload. Esperar a que aparezca
    // la foto en la sección de fotos. Damos tiempo generoso porque
    // cada upload pasa por: storage upload + registerFotoAction + state update.
    const fotosSection = page.locator("section").filter({
      has: page.locator('input[type="file"][accept^="image"]'),
    });
    await expect(fotosSection.locator("ul > li")).toHaveCount(1, {
      timeout: 90_000,
    });

    // G06 — submit a revisión (el checklist ya debería estar completo)
    const submitBtn = page.getByRole("button", { name: /enviar a revisi/i });
    await expect(submitBtn).toBeEnabled({ timeout: 15_000 });
    await submitBtn.click();

    // La acción server confirma con un mensaje de éxito. Luego recargamos para
    // leer el estado fresco del server component (evita la carrera entre
    // router.refresh() y el recompile on-demand de `next dev`).
    await expect(page.getByText(/enviado a revisión/i)).toBeVisible({
      timeout: 15_000,
    });
    await page.reload();
    await expect(page.getByText(/estado:\s*pendiente/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("G07-G08 — admin: login → aprobar pendiente", async ({ page }) => {
    expect(hospedajeId).toBeTruthy();

    await loginAdmin(page);
    await expect(page).toHaveURL(/\/admin(?!\/login)/);

    await page.goto("/admin/validaciones");

    const card = page.locator("article").filter({ hasText: NOMBRE });
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole("button", { name: /aprobar y publicar/i }).click();

    // La card debería desaparecer
    await expect(card).not.toBeVisible({ timeout: 15_000 });
  });

  test("G09 — sitio público muestra el hospedaje publicado", async ({ page }) => {
    expect(SLUG).toBeTruthy();

    await page.goto(`/las-gaviotas/hospedajes/${SLUG}`);
    await expect(page.getByRole("heading", { name: NOMBRE })).toBeVisible({
      timeout: 15_000,
    });
  });
});
