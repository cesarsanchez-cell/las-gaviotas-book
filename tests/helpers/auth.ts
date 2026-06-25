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
  await page.getByRole("textbox", { name: /contraseña/i }).fill(who.password);
  await page.getByRole("button", { name: /ingresar|entrar|iniciar/i }).click();
  // `commit` (no `load`): nos alcanza con que la navegación a /panel ocurra. Si
  // esperáramos `load`, una foto con URL rota (tests que seedean storage_path
  // falso) podría colgar el evento. Timeout holgado por el compile de `next dev`.
  await page.waitForURL(/\/panel/, { timeout: 60_000, waitUntil: "commit" });
}

export async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByRole("textbox", { name: /contraseña/i }).fill(ADMIN.password);
  await page.getByRole("button", { name: /ingresar|entrar|iniciar/i }).click();
  // `commit` (no `load`): basta con que ocurra la navegación a /admin. Timeout
  // holgado por el compile on-demand de `next dev`.
  await page.waitForURL(/\/admin(?!\/login)/, {
    timeout: 60_000,
    waitUntil: "commit",
  });
}
