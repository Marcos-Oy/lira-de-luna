import { type Page } from "@playwright/test";

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || "admin@liradeluna.cl";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "Lira2025!";

/** Inicia sesión como administrador y espera a llegar al panel. */
export async function loginAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.fill('input[type="email"]',    ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin**", { timeout: 10_000 });
}

/** Cierra sesión del administrador. */
export async function logoutAdmin(page: Page) {
  await page.goto("/admin");
  // Botón de logout en el sidebar
  const logoutBtn = page.getByRole("button", { name: /cerrar sesión|logout/i });
  if (await logoutBtn.isVisible()) await logoutBtn.click();
}

/** Datos de un usuario de prueba con contraseña que cumple complejidad ISO 27001. */
export const testUser = {
  name:     "Test E2E",
  email:    `test.e2e.${Date.now()}@playwright.local`,
  password: "Test@E2E#2025!",
};
