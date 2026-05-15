import { test, expect } from "@playwright/test";
import {
  loginResponsable,
  loginAdmin,
  RESPONSABLE,
  RESPONSABLE_2,
} from "../helpers/auth";
import {
  cleanupTestHospedajes,
  resetResponsableHospedajes,
  seedHospedajeAsResponsable,
} from "../helpers/cleanup";

const EDGE_SLUG_PREFIX = "test-edge-";
const TS = Date.now();

test.beforeAll(async () => {
  await cleanupTestHospedajes(EDGE_SLUG_PREFIX);
  await resetResponsableHospedajes(RESPONSABLE.email);
  await resetResponsableHospedajes(RESPONSABLE_2.email);
});

test.afterAll(async () => {
  await cleanupTestHospedajes(EDGE_SLUG_PREFIX);
  await resetResponsableHospedajes(RESPONSABLE.email);
  await resetResponsableHospedajes(RESPONSABLE_2.email);
});

test.describe("Edge cases — control de seguridad y UX", () => {
  test("E01 — registro con email duplicado da mensaje claro (no FK violation)", async ({
    page,
  }) => {
    await page.goto("/registro");

    await page.locator('input[name="nombre"]').fill("Duplicate Test");
    await page.locator('input[name="email"]').fill(RESPONSABLE.email);
    await page.locator('input[name="password"]').fill("OtraPassword123!");

    await page.getByRole("button", { name: /crear cuenta/i }).click();

    // Debe mostrar el mensaje del fix del bug #002, NO la FK violation cruda.
    await expect(
      page.getByText(/ya existe una cuenta|cuenta ya/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/foreign key|fkey|violates/i)).toHaveCount(0);
  });

  test("E03 — responsable A no puede acceder al hospedaje de B (404)", async ({
    page,
  }) => {
    const slug = `${EDGE_SLUG_PREFIX}b-${TS}`;
    const hospedajeIdDeB = await seedHospedajeAsResponsable(
      RESPONSABLE_2.email,
      slug,
      `Hospedaje de B ${TS}`
    );

    // Login como Responsable A
    await loginResponsable(page, RESPONSABLE);

    // Intentar acceder al hospedaje de B directamente por URL
    const res = await page.goto(`/panel/hospedajes/${hospedajeIdDeB}`);
    // Esperado: not found (status 404) — el page.tsx hace notFound() si id no
    // está en hospedajes_ids del perfil del A.
    expect(res?.status()).toBe(404);
  });

  test("E04 — submit a revisión está deshabilitado con checklist incompleto", async ({
    page,
  }) => {
    const slug = `${EDGE_SLUG_PREFIX}incompleto-${TS}`;
    const hospedajeId = await seedHospedajeAsResponsable(
      RESPONSABLE.email,
      slug,
      `Hospedaje Incompleto ${TS}`
    );

    await loginResponsable(page, RESPONSABLE);
    await page.goto(`/panel/hospedajes/${hospedajeId}`);

    const submitBtn = page.getByRole("button", { name: /enviar a revisi/i });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    // El texto del state Borrador debe mostrar cuántos ítems faltan
    await expect(page.getByText(/te faltan \d+ ítems/i)).toBeVisible();
  });

  test("E08 — admin logueado no puede acceder al panel responsable (redirect)", async ({
    page,
  }) => {
    await loginAdmin(page);
    await page.goto("/panel");
    // requireResponsable detecta rol=admin y redirige a /admin
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 10_000 });
  });

  test("E10 — responsable puede editar hospedaje publicado (regresión bug #003)", async ({
    page,
  }) => {
    const slug = `${EDGE_SLUG_PREFIX}publicado-${TS}`;
    const hospedajeId = await seedHospedajeAsResponsable(
      RESPONSABLE.email,
      slug,
      `Hospedaje Publicado ${TS}`,
      "publicado"
    );

    await loginResponsable(page, RESPONSABLE);
    await page.goto(`/panel/hospedajes/${hospedajeId}`);

    // El campo de estado NO debe aparecer (mode=responsable lo oculta)
    await expect(page.locator('select[name="estado"]')).toHaveCount(0);

    // Modificar la descripción corta (campo NO crítico) y guardar
    const nuevaDesc = `Descripción actualizada en ${new Date().toISOString()}`;
    await page.locator('textarea[name="descripcion_corta"]').fill(nuevaDesc);

    await page.getByRole("button", { name: /guardar cambios/i }).click();

    // NO debe aparecer el error de RLS
    await expect(page.getByText(/row-level security/i)).toHaveCount(0, {
      timeout: 8_000,
    });
    // El estado debe seguir siendo publicado (descripción no es crítica)
    await expect(page.getByText(/estado:\s*publicado/i)).toBeVisible();
  });

  test("E11 — cambio de campo crítico en publicado vuelve a pendiente_validacion", async ({
    page,
  }) => {
    const slug = `${EDGE_SLUG_PREFIX}critico-${TS}`;
    const hospedajeId = await seedHospedajeAsResponsable(
      RESPONSABLE.email,
      slug,
      `Hospedaje Critico ${TS}`,
      "publicado"
    );

    await loginResponsable(page, RESPONSABLE);
    await page.goto(`/panel/hospedajes/${hospedajeId}`);

    // El aviso de cambios críticos debe estar visible
    await expect(
      page.getByText(/cambios que requieren nueva revisi/i)
    ).toBeVisible();

    // Modificar la dirección (CAMPO CRÍTICO)
    await page
      .locator('input[name="direccion"]')
      .fill("Nueva dirección modificada 123");

    await page.getByRole("button", { name: /guardar cambios/i }).click();

    // Esperar reload — el estado debe haber cambiado a pendiente_validacion
    await expect(page.getByText(/estado:\s*pendiente/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
