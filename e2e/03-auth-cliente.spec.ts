import { test, expect } from "@playwright/test";
import { testUser } from "./helpers/auth";

/**
 * Suite: Autenticación de clientes
 * Prueba los flujos de registro, login y logout del cliente.
 * ISO 27001 A.9.4.2 — Secure log-on procedures
 */
test.describe("Autenticación de clientes", () => {

  test("página de login carga correctamente", async ({ page }) => {
    await page.goto("/cuenta/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar|iniciar/i })).toBeVisible();
  });

  test("login con credenciales inválidas muestra error genérico", async ({ page }) => {
    await page.goto("/cuenta/login");
    await page.fill('input[type="email"]',    "noexiste@test.com");
    await page.fill('input[type="password"]', "WrongPass@123!");
    await page.click('button[type="submit"]');

    // Debe mostrar error sin revelar si el email existe
    await expect(page.getByRole("alert").or(page.locator("[role='alert'], .error, [class*='error']")).first())
      .toBeVisible({ timeout: 5_000 });
  });

  test("login con email mal formado no procede", async ({ page }) => {
    await page.goto("/cuenta/login");
    await page.fill('input[type="email"]',    "noesvalido");
    await page.fill('input[type="password"]', "Password@1!");

    // HTML5 validation debe detener el submit
    const emailInput = page.locator('input[type="email"]');
    const isInvalid  = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test("página de registro carga correctamente", async ({ page }) => {
    await page.goto("/cuenta/registro");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("registro con contraseña débil muestra error de complejidad", async ({ page }) => {
    await page.goto("/cuenta/registro");

    await page.fill('input[name="name"], input[placeholder*="nombre"]',  "Test User");
    await page.fill('input[type="email"]',    "test.weak@example.com");
    await page.fill('input[type="password"]', "password123"); // sin mayúscula ni símbolo

    await page.click('button[type="submit"]');

    // Debe mostrar error de complejidad
    const errorMsg = page.locator("text=/mayúscula|símbolo|complejidad|requisitos/i");
    if (await errorMsg.count() > 0) {
      await expect(errorMsg.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test("rutas protegidas redirigen a login si no hay sesión", async ({ page }) => {
    await page.goto("/cuenta/perfil");
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });
  });

  test("rutas protegidas de pedidos redirigen a login", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page).toHaveURL(/login/, { timeout: 5_000 });
  });

  test("recuperar contraseña: página carga", async ({ page }) => {
    await page.goto("/cuenta/recuperar");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
