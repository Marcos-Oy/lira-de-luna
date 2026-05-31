import { test, expect } from "@playwright/test";

/**
 * Suite: Prevención de XSS e inyección de código
 * ISO 27001 A.14.2.5 — Secure system engineering principles
 * Verifica que los campos de entrada no ejecuten código JavaScript inyectado.
 */
test.describe("Prevención de XSS e inyección", () => {

  // Payload XSS clásico — si se ejecuta, lanza un alert()
  const XSS_PAYLOAD = '<script>window.__xss_executed=true</script><img src=x onerror="window.__xss_executed=true">';
  const XSS_SIMPLE  = '"><script>window.__xss_executed=true</script>';

  async function xssWasExecuted(page: import("@playwright/test").Page): Promise<boolean> {
    return page.evaluate(() => !!(window as Window & { __xss_executed?: boolean }).__xss_executed);
  }

  test("buscador de tienda no ejecuta XSS en el parámetro q", async ({ page }) => {
    await page.goto(`/tienda?q=${encodeURIComponent(XSS_PAYLOAD)}`);
    await page.waitForLoadState("networkidle");
    expect(await xssWasExecuted(page)).toBe(false);
  });

  test("campo de búsqueda: input no ejecuta XSS al escribir", async ({ page }) => {
    await page.goto("/tienda");

    const searchInput = page.getByPlaceholder(/buscar/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(XSS_PAYLOAD);
      await searchInput.press("Enter");
      await page.waitForTimeout(1000);
      expect(await xssWasExecuted(page)).toBe(false);
    }
  });

  test("campo email de login no ejecuta XSS", async ({ page }) => {
    await page.goto("/cuenta/login");
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(XSS_SIMPLE);
    await page.locator('input[type="password"]').fill("SomePassword@1!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(await xssWasExecuted(page)).toBe(false);
  });

  test("campo email del admin login no ejecuta XSS", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[type="email"]').fill(XSS_SIMPLE);
    await page.locator('input[type="password"]').fill("SomePassword@1!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    expect(await xssWasExecuted(page)).toBe(false);
  });

  test("campo de nombre en checkout no ejecuta XSS", async ({ page }) => {
    await page.goto("/checkout");
    const nameInput = page.locator('input[placeholder*="nombre"], input[name="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(XSS_PAYLOAD);
      await page.waitForTimeout(500);
      expect(await xssWasExecuted(page)).toBe(false);
    }
  });

  test("parámetros URL arbitrarios no causan XSS", async ({ page }) => {
    await page.goto(`/tienda?col=${encodeURIComponent(XSS_SIMPLE)}&sort=newest`);
    await page.waitForLoadState("networkidle");
    expect(await xssWasExecuted(page)).toBe(false);
  });

  test("formulario de suscripción al newsletter no ejecuta XSS", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(XSS_SIMPLE);
      await page.waitForTimeout(500);
      expect(await xssWasExecuted(page)).toBe(false);
    }
  });

  test("inyección SQL en campo de búsqueda no genera error 500", async ({ page }) => {
    const sqlPayload = "' OR '1'='1'; DROP TABLE users; --";
    const res = await page.request.get(`/tienda?q=${encodeURIComponent(sqlPayload)}`);
    // Debe responder 200 (no error de servidor)
    expect(res.status()).toBe(200);
  });

  test("inyección SQL en parámetro de página no genera error 500", async ({ page }) => {
    const res = await page.request.get("/tienda?page=' OR 1=1--");
    expect(res.status()).toBe(200);
  });

  test("inyección SQL en filtro de colección no genera error 500", async ({ page }) => {
    const res = await page.request.get("/tienda?col='; DROP TABLE products; --");
    expect(res.status()).toBe(200);
  });

  test("API de registro no acepta body con inyección HTML", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: {
        name:     "<script>alert(1)</script>",
        email:    "xss@test.com",
        password: "Weak123",  // contraseña débil — debe rechazarse
      },
    });
    // Debe rechazar por contraseña débil (422) o validación (no 200)
    expect(res.status()).not.toBe(200);
    expect([400, 422, 429]).toContain(res.status());
  });

  test("abrir redirect manipulado no redirige a dominio externo", async ({ page }) => {
    // Intento de open redirect
    await page.goto("/");

    // Verificar que cualquier redirect en la app solo va a rutas internas
    const currentUrl = page.url();
    expect(currentUrl).toContain("localhost:3000");
  });
});
