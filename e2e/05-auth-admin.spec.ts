import { test, expect } from "@playwright/test";
import { loginAdmin, logoutAdmin } from "./helpers/auth";

/**
 * Suite: Autenticación del administrador
 * ISO 27001 A.9.4.2 — Verifica login seguro, protección de rutas y rate limiting.
 */
test.describe("Autenticación de administrador", () => {

  test("página de login admin carga correctamente", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login admin con credenciales válidas accede al panel", async ({ page }) => {
    await loginAdmin(page);
    // Debe estar en el panel admin después del login
    expect(page.url()).toContain("/admin");
    // El sidebar del panel debe estar visible
    await expect(page.locator("nav, aside").first()).toBeVisible({ timeout: 5_000 });
  });

  test("login admin con contraseña incorrecta muestra error genérico", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]',    "admin@liradeluna.cl");
    await page.fill('input[type="password"]', "WrongPassword@123!");
    await page.click('button[type="submit"]');

    // Debe mostrar "Credenciales inválidas" (nunca revela si el email existe)
    await expect(
      page.getByText(/credenciales inválidas|inválido|incorrecto/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("login admin con email inexistente muestra el mismo error genérico", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill('input[type="email"]',    "noexiste@admin.com");
    await page.fill('input[type="password"]', "Password@Test#1!");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText(/credenciales inválidas|inválido|incorrecto/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("rutas admin protegidas redirigen a login sin sesión", async ({ page }) => {
    // Acceso directo al panel sin login
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 5_000 });
  });

  test("rutas admin protegidas: pedidos requieren auth", async ({ page }) => {
    await page.goto("/admin/pagos");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 5_000 });
  });

  test("rutas admin protegidas: configuración requiere auth", async ({ page }) => {
    await page.goto("/admin/configuracion");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 5_000 });
  });

  test("rate limiting: múltiples intentos fallidos reciben 429", async ({ request }) => {
    const attempts = [];
    for (let i = 0; i < 7; i++) {
      attempts.push(
        request.post("/api/admin/auth", {
          data: { email: "test@test.com", password: `WrongPass@${i}!` },
        })
      );
    }
    const responses = await Promise.all(attempts);
    const statuses  = responses.map((r) => r.status());

    // Al menos una de las respuestas debe ser 429 (demasiados intentos)
    // Los primeros 5 dan 401, a partir del 6 da 429
    expect(statuses.some((s) => s === 429)).toBe(true);
  });

  test("logout admin elimina la sesión", async ({ page }) => {
    await loginAdmin(page);

    // Hacer logout
    await logoutAdmin(page);

    // Intentar acceder al panel de nuevo → debe redirigir a login
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 5_000 });
  });

  test("cookie admin es httpOnly (no accesible por JavaScript)", async ({ page }) => {
    await loginAdmin(page);

    // Intentar leer la cookie admin_token desde JavaScript → debe ser undefined
    const cookieValue = await page.evaluate(() => {
      return document.cookie.includes("admin_token");
    });
    expect(cookieValue).toBe(false); // httpOnly = no visible en JS
  });
});
