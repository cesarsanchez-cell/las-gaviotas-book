import { test, expect } from "@playwright/test";
import { RESPONSABLE } from "../helpers/auth";
import {
  seedHospedajeAsResponsable,
  seedLugarAsResponsable,
  cleanupTestHospedajes,
  cleanupTestLugares,
  resetResponsableHospedajes,
} from "../helpers/cleanup";

// Cierre del circuito del cliente: el canal de contacto según el tipo.
//  - Hospedaje → formulario de consulta (lead) en la ficha.
//  - Gastronómico / Qué hacer → botón de WhatsApp directo.
// Seedeamos entidades publicadas server-side (sin pasar por la UI de carga) y
// verificamos el contacto en la ficha pública.

const HOSP_PREFIX = "test-e2e-consulta-h-";
const LUGAR_PREFIX = "test-e2e-lugar-"; // mismo prefijo que limpia cleanupTestLugares

const TS = Date.now();
const HOSP_SLUG = `${HOSP_PREFIX}${TS}`;
const HOSP_NOMBRE = `Test E2E Consulta Hospedaje ${TS}`;
const LUGAR_SLUG = `${LUGAR_PREFIX}consulta-${TS}`;
const LUGAR_NOMBRE = `Test E2E Consulta Qué hacer ${TS}`;

test.beforeAll(async () => {
  await cleanupTestHospedajes(HOSP_PREFIX);
  await cleanupTestLugares(LUGAR_PREFIX);
  await seedHospedajeAsResponsable(
    RESPONSABLE.email,
    HOSP_SLUG,
    HOSP_NOMBRE,
    "publicado"
  );
  await seedLugarAsResponsable(
    RESPONSABLE.email,
    LUGAR_SLUG,
    LUGAR_NOMBRE,
    "atractivo",
    "publicado"
  );
});

test.afterAll(async () => {
  await cleanupTestHospedajes(HOSP_PREFIX);
  await cleanupTestLugares(LUGAR_PREFIX);
  await resetResponsableHospedajes(RESPONSABLE.email);
});

test("C01 — ficha de hospedaje muestra el formulario de consulta (lead)", async ({
  page,
}) => {
  await page.goto(`/las-gaviotas/hospedajes/${HOSP_SLUG}`);
  await expect(page.getByRole("heading", { name: HOSP_NOMBRE })).toBeVisible({
    timeout: 15_000,
  });

  // El formulario de consulta está en la ficha (sección "Consultar").
  await expect(
    page.getByRole("heading", { name: /consultar disponibilidad/i })
  ).toBeVisible();
  await expect(page.locator('input[name="nombre"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('textarea[name="mensaje"]')).toBeVisible();
});

test("C02 — ficha de hospedaje: la consulta es completable y enviable", async ({
  page,
}) => {
  await page.goto(`/las-gaviotas/hospedajes/${HOSP_SLUG}`);
  await page.locator('input[name="nombre"]').fill("Cliente Test");
  await page.locator('input[name="email"]').fill("cliente.test@example.com");
  await page.locator('input[name="whatsapp"]').fill("1155555555");
  await page
    .locator('textarea[name="mensaje"]')
    .fill("Hola, quería consultar disponibilidad y precios para el finde.");
  const consent = page.locator('input[name="consentimiento"]');
  if (await consent.count()) await consent.check();

  // No verificamos la entrega del mail acá (eso va al checklist manual), pero el
  // submit no debe romper con error de RLS/permeso.
  await page.getByRole("button", { name: /enviar consulta/i }).click();
  await expect(page.getByText(/row-level security/i)).toHaveCount(0, {
    timeout: 8_000,
  });
});

test("C03 — ficha de 'qué hacer' ofrece contacto por WhatsApp", async ({
  page,
}) => {
  await page.goto(`/las-gaviotas/atractivos/${LUGAR_SLUG}`);
  await expect(page.getByRole("heading", { name: LUGAR_NOMBRE })).toBeVisible({
    timeout: 15_000,
  });
  // Contacto directo: link/botón de WhatsApp (no usa la tabla consultas).
  const wa = page.getByRole("link", { name: /whatsapp/i }).first();
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute("href", /wa\.me|whatsapp/i);
});
