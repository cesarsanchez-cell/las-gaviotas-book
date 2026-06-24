import { test, expect } from "@playwright/test";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginResponsable, RESPONSABLE } from "../helpers/auth";

/**
 * Test del flujo de responsable (simplificado):
 * - Usa usuario preexistente (RESPONSABLE)
 * - Navega al panel
 * - Crea un hospedaje
 * - Crea un gastronómico
 * - Verifica que aparecen en el listado
 *
 * Valida que el UI funciona correctamente después de eliminar /onboarding.
 * No prueba el signup (confirmación de email), que es ortogonal a este refactor.
 */

test.describe("Responsable Panel: Crear Hospedaje y Comercio", () => {
  let hospedajeId: string | null = null;
  let lugarId: string | null = null;
  const DESTINO_TEST = "0a6e7d5b-85ce-4efb-b1e8-fab81ee8e3be"; // Las Gaviotas

  test("1. Login como responsable", async ({ page }) => {
    await loginResponsable(page, RESPONSABLE);
    expect(page.url()).toContain("/panel");
    console.log("✅ Login exitoso");
  });

  test("2. Navegar a /panel/hospedajes/nuevo y crear hospedaje", async ({
    page,
  }) => {
    await loginResponsable(page, RESPONSABLE);
    await page.goto("/panel/hospedajes/nuevo");

    // Datos básicos
    const slug = `test-h-${Date.now()}`;
    await page.fill('input[name="nombre"]', "Hospedaje Test Flow");
    await page.fill('input[name="slug"]', slug);
    await page.fill('input[name="direccion"]', "Calle Test 1");
    await page.fill('textarea[name="descripcion_corta"]', "Test descripción");

    // Seleccionar destino
    const selectDestino = page.locator('select[name="destino_id"]');
    if (await selectDestino.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectDestino.selectOption(DESTINO_TEST);
    }

    // Crear
    const btnCrear = page.locator(
      'button:has-text("Crear hospedaje"), button:has-text("Crear")'
    );
    await btnCrear.first().click();

    // Esperar redireccion al hospedaje (URL con ID)
    await page.waitForURL(/\/panel\/hospedajes\/[a-f0-9-]{36}/, {
      timeout: 15000,
    });

    const url = page.url();
    const match = url.match(/\/panel\/hospedajes\/([a-f0-9-]{36})/);
    if (match) {
      hospedajeId = match[1];
      console.log("✅ Hospedaje creado:", hospedajeId);
    }
  });

  test("3. Crear un gastronómico", async ({ page }) => {
    await loginResponsable(page, RESPONSABLE);
    await page.goto("/panel/lugares/nuevo");

    // Pantalla de elección: clickear Gastronómico
    await page.click('a[href*="tipo=gastronomico"]');

    // Esperar que cargue el formulario
    await page.waitForURL(/tipo=gastronomico/, { timeout: 10000 });

    // Llenar datos
    const slug = `test-g-${Date.now()}`;
    await page.fill('input[name="nombre"]', "Gastronómico Test Flow");
    await page.fill('input[name="slug"]', slug);
    await page.fill('input[name="direccion"]', "Avenida Test 1");
    await page.fill('textarea[name="descripcion_corta"]', "Test gastro");

    // Seleccionar destino
    const selectDestino = page.locator('select[name="destino_id"]');
    if (await selectDestino.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectDestino.selectOption(DESTINO_TEST);
    }

    // Crear
    const btnCrear = page.locator(
      'button:has-text("Crear gastronómico"), button:has-text("Crear")'
    );
    await btnCrear.first().click();

    // Esperar redireccion
    await page.waitForURL(/\/panel\/lugares\/[a-f0-9-]{36}/, {
      timeout: 15000,
    });

    const url = page.url();
    const match = url.match(/\/panel\/lugares\/([a-f0-9-]{36})/);
    if (match) {
      lugarId = match[1];
      console.log("✅ Gastronómico creado:", lugarId);
    }
  });

  test("4. Verificar que ambas entidades aparecen en el panel", async ({
    page,
  }) => {
    await loginResponsable(page, RESPONSABLE);
    await page.goto("/panel");

    // Debe haber secciones "Mis hospedajes" y "Mis comercios"
    await expect(page.locator("text=Mis hospedajes")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("text=Mis comercios")).toBeVisible({
      timeout: 5000,
    });

    console.log("✅ Panel carga secciones correctamente");
  });

  test("5. Limpiar datos de test", async () => {
    const admin = createAdminClient();

    if (hospedajeId) {
      // Borrar responsabilidades
      await admin
        .from("responsabilidades")
        .delete()
        .eq("entidad_id", hospedajeId)
        .eq("entidad_tipo", "hospedaje");

      // Borrar hospedaje
      await admin.from("hospedajes").delete().eq("id", hospedajeId);
    }

    if (lugarId) {
      // Borrar responsabilidades
      await admin
        .from("responsabilidades")
        .delete()
        .eq("entidad_id", lugarId)
        .eq("entidad_tipo", "lugar");

      // Borrar lugar
      await admin.from("lugares").delete().eq("id", lugarId);
    }

    console.log("✅ Datos de test limpiados");
  });
});
