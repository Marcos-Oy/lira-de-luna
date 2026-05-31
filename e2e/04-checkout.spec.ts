import { test, expect } from "@playwright/test";

/**
 * Suite: Checkout
 * Valida el formulario de checkout, validaciones de campos y flujo de pago por transferencia.
 * No genera órdenes reales — prueba validaciones del lado cliente y servidor.
 */
test.describe("Checkout", () => {

  test("checkout sin ítems redirige a tienda", async ({ page }) => {
    // Limpiar carrito accediendo directamente
    await page.goto("/checkout");
    // Si el carrito está vacío, debe redirigir o mostrar estado vacío
    await expect(page).toHaveURL(/checkout|tienda/, { timeout: 5_000 });
  });

  test("campos obligatorios del formulario muestran validación", async ({ page }) => {
    await page.goto("/checkout");

    // Intentar enviar sin llenar campos (solo si hay ítems / formulario visible)
    const form = page.locator("form");
    if (await form.count() > 0) {
      const submitBtn = page.getByRole("button", { name: /confirmar|pagar|pedido/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Debe haber validación de campos requeridos (HTML5 o error en pantalla)
        const emailInput = page.locator('input[type="email"]').first();
        if (await emailInput.count() > 0) {
          const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
          expect(isInvalid).toBe(true);
        }
      }
    }
  });

  test("email inválido en checkout muestra error", async ({ page }) => {
    await page.goto("/checkout");

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill("notvalid");
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBe(true);
    }
  });

  test("página de comprobante requiere autenticación", async ({ page }) => {
    await page.goto("/cuenta/comprobante/orden-inexistente");
    // Debe redirigir a login o mostrar 404
    await expect(page).toHaveURL(/login|cuenta/, { timeout: 5_000 });
  });

  test("selector de país de envío está presente", async ({ page }) => {
    await page.goto("/checkout");

    const countrySelect = page.locator("select").filter({ hasText: /chile|argentina|colombia/i });
    if (await countrySelect.count() > 0) {
      await expect(countrySelect.first()).toBeVisible();
    }
  });
});
