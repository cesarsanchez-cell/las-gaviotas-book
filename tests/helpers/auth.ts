import type { Page } from "@playwright/test";

export const RESPONSABLE = {
  email: "responsable1@test.com",
  password: "Test1234!",
  nombre: "Responsable Uno",
};

export const RESPONSABLE_2 = {
  email: "responsable2@test.com",
  password: "Test1234!",
  nombre: "Responsable Dos",
};

export const ADMIN = {
  email: "admin.test@test.com",
  password: "TestAdmin1234!",
  nombre: "Admin Tester",
};

export async function loginResponsable(
  page: Page,
  who: { email: string; password: string } = RESPONSABLE
) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(who.email);
  await page.getByLabel(/contrase/i).fill(who.password);
  await page.getByRole("button", { name: /ingresar|entrar|iniciar/i }).click();
  // Timeout holgado: la 1ª vez `next dev` compila /panel on-demand (puede tardar).
  await page.waitForURL(/\/panel/, { timeout: 60_000 });
}

export async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/contrase/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /ingresar|entrar|iniciar/i }).click();
  // Timeout holgado: la 1ª vez `next dev` compila /admin on-demand (puede tardar).
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 60_000 });
}
