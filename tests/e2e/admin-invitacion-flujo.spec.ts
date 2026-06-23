import { test, expect } from "@playwright/test";
import { createAdminClient } from "@/lib/supabase/admin";

test.describe("Admin Invitación Flujo - Responsable Completa Datos", () => {
  const testEmail = `test-responsable-${Date.now()}@example.com`;
  const testWhatsapp = "1155555555";
  let hospedajeId: string;

  test("1. Admin crea invitación a responsable", async ({ page }) => {
    // Ir a admin login
    await page.goto("/admin/login");

    // Login como admin (usar credentials de prueba/admin real)
    // Nota: cambiar estos valores según tu admin test real
    const adminEmail = "admin@example.com"; // Cambiar a admin real
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', "Tu contraseña admin"); // Cambiar
    await page.click("button:has-text('Ingresar')");

    // Esperar que cargue dashboard
    await page.waitForURL("/admin/hospedajes", { timeout: 10000 });
    expect(page.url()).toContain("/admin/hospedajes");

    // Hacer clic en "Invitar responsable" o "Nuevo"
    await page.click("a:has-text('Invitar responsable'), button:has-text('Nuevo hospedaje')");

    // Esperar página de invitación
    await page.waitForURL(/\/admin\/hospedajes\/nuevo/, { timeout: 5000 });

    // Completar formulario
    await page.fill('input[name="nombre"]', "Test Cabaña E2E");
    await page.fill('input[name="responsable_email"]', testEmail);
    await page.fill('input[name="responsable_whatsapp"]', testWhatsapp);

    // Enviar invitación
    await page.click('button:has-text("Enviar invitación")');

    // Esperar confirmación (redirección a listado)
    await page.waitForURL("/admin/hospedajes", { timeout: 10000 });
    expect(page.url()).toContain("/admin/hospedajes");
  });

  test("2. Verificar que hospedaje fue creado en base de datos", async () => {
    // Conectar directamente a DB para verificar
    const admin = createAdminClient();

    const { data: hospedajes, error } = await admin
      .from("hospedajes")
      .select("id, nombre, responsable_email, estado")
      .eq("responsable_email", testEmail)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(hospedajes).toHaveLength(1);

    const h = hospedajes![0];
    hospedajeId = h.id;
    expect(h.nombre).toBe("Test Cabaña E2E");
    expect(h.responsable_email).toBe(testEmail);
    expect(h.estado).toBe("borrador");
  });

  test("3. Responsable se registra con email invitado", async ({ page }) => {
    // Ir directamente a panel (simula hacer clic en link del email)
    await page.goto(`/panel/hospedajes/${hospedajeId}`);

    // Debería redirigir a login/registro porque no está autenticado
    await page.waitForURL(/\/(login|registro|panel)/, { timeout: 5000 });

    // Si no está autenticado, debería ofrecer registro
    // Completar registro
    await page.goto("/registro");

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', "TestPassword123!");
    await page.fill('input[name="password_confirm"]', "TestPassword123!");
    await page.fill('input[name="nombre"]', "Test Owner");

    // Enviar
    await page.click('button:has-text("Crear cuenta")');

    // Esperar que se cree y redirija
    await page.waitForURL(/\/(panel|email-confirmation)/, { timeout: 10000 });
  });

  test("4. Verificar que responsabilidad fue creada automáticamente", async () => {
    // Conectar a DB y verificar que existe responsabilidades entry
    const admin = createAdminClient();

    // Primero obtener el perfil del usuario test
    const { data: perfiles, error: perfilError } = await admin
      .from("perfiles")
      .select("id")
      .eq("email", testEmail)
      .single();

    expect(perfilError).toBeNull();
    expect(perfiles).toBeTruthy();

    const userId = perfiles!.id;

    // Luego verificar que existe responsabilidades
    const { data: responsabilidades, error: respError } = await admin
      .from("responsabilidades")
      .select("*")
      .eq("perfil_id", userId)
      .eq("entidad_id", hospedajeId)
      .eq("entidad_tipo", "hospedaje");

    expect(respError).toBeNull();
    expect(responsabilidades).toHaveLength(1);
  });

  test("5. Responsable ve hospedaje en /panel y puede completar datos", async ({
    page,
  }) => {
    // Login como responsable
    await page.goto("/login");

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', "TestPassword123!");
    await page.click('button:has-text("Ingresar")');

    // Esperar panel
    await page.waitForURL("/panel", { timeout: 10000 });

    // Navegar a hospedajes
    await page.goto("/panel/hospedajes");

    // Debería listar el hospedaje invitado
    await page.waitForSelector(`text=Test Cabaña E2E`, { timeout: 5000 });
    expect(await page.locator(`text=Test Cabaña E2E`).count()).toBeGreaterThan(0);

    // Hacer clic en el hospedaje para editarlo
    await page.click(`a:has-text("Test Cabaña E2E")`);

    // Esperar formulario de edición
    await page.waitForSelector('input[name="descripcion_corta"]', { timeout: 5000 });

    // Completar datos
    await page.fill('input[name="slug"]', "test-cabana-e2e");
    await page.fill('input[name="direccion"]', "Calle Test 123");
    await page.fill('textarea[name="descripcion_corta"]', "Una cabaña de prueba para test E2E");

    // Guardar
    await page.click('button:has-text("Guardar")');

    // Esperar confirmación
    await page.waitForURL(/\/panel\/hospedajes/, { timeout: 10000 });
  });

  test("6. Limpiar datos de test", async () => {
    const admin = createAdminClient();

    // Eliminar hospedaje
    await admin.from("hospedajes").delete().eq("id", hospedajeId);

    // Eliminar perfil y responsabilidades (cascada debería hacerlo)
    const { data: perfiles } = await admin
      .from("perfiles")
      .select("id")
      .eq("email", testEmail)
      .single();

    if (perfiles) {
      await admin.from("perfiles").delete().eq("id", perfiles.id);
    }
  });
});
