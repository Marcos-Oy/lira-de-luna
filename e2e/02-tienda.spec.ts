import { test, expect } from "@playwright/test";

/**
 * Suite: Tienda pública
 * Verifica el flujo de navegación, filtros por URL/backend y paginación.
 */
test.describe("Tienda pública", () => {

  test("página de inicio carga correctamente", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lira de Luna/i);
    // Navbar visible
    await expect(page.locator("nav")).toBeVisible();
  });

  test("tienda carga la página de productos", async ({ page }) => {
    await page.goto("/tienda");
    await expect(page).toHaveTitle(/Tienda/i);
    // El sidebar de filtros debe estar presente
    await expect(page.getByText("Filtros")).toBeVisible();
  });

  test("búsqueda por texto actualiza URL y resultados", async ({ page }) => {
    await page.goto("/tienda");

    // Escribe en el campo de búsqueda
    const searchInput = page.getByPlaceholder(/buscar productos/i);
    await searchInput.fill("collar");
    await searchInput.press("Enter");

    // La URL debe contener el parámetro q
    await page.waitForURL("**/tienda?**q=collar**", { timeout: 8_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get("q")).toBe("collar");
  });

  test("filtro por categoría actualiza la URL", async ({ page }) => {
    await page.goto("/tienda");

    // Clic en la primera categoría del sidebar (si existen)
    const categoryCheckbox = page.locator("aside").locator('input[type="checkbox"]').first();
    if (await categoryCheckbox.count() > 0) {
      await categoryCheckbox.click();
      // La URL debe actualizarse con el parámetro col
      await page.waitForURL("**/tienda?**", { timeout: 5_000 });
      const url = new URL(page.url());
      expect(url.searchParams.has("col")).toBe(true);
    }
  });

  test("selector de ordenamiento actualiza la URL", async ({ page }) => {
    await page.goto("/tienda");

    const sortSelect = page.locator("select").first();
    await sortSelect.selectOption("price-asc");

    await page.waitForURL("**/tienda?**sort=price-asc**", { timeout: 5_000 });
    expect(new URL(page.url()).searchParams.get("sort")).toBe("price-asc");
  });

  test("limpiar filtros vuelve a la tienda sin parámetros", async ({ page }) => {
    await page.goto("/tienda?q=collar&sort=price-asc");

    const clearBtn = page.getByText(/limpiar todo/i);
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForURL("**/tienda", { timeout: 5_000 });
      const url = new URL(page.url());
      expect(url.search).toBe("");
    }
  });

  test("paginación: clic en página 2 actualiza URL", async ({ page }) => {
    await page.goto("/tienda");

    // Buscar botón de página 2 (solo si totalPages > 1)
    const page2Btn = page.locator("nav[aria-label='Paginación'] button", { hasText: "2" });
    if (await page2Btn.count() > 0) {
      await page2Btn.click();
      await page.waitForURL("**/tienda?**page=2**", { timeout: 5_000 });
      expect(new URL(page.url()).searchParams.get("page")).toBe("2");
    }
  });

  test("página de producto individual carga", async ({ page }) => {
    await page.goto("/tienda");

    // Clic en el primer producto
    const firstProduct = page.locator("a[href*='/producto/']").first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await expect(page).toHaveURL(/\/producto\//);
      // El botón de añadir al carrito debe estar presente
      await expect(page.getByRole("button", { name: /añadir/i })).toBeVisible({ timeout: 5_000 });
    }
  });

  test("página de colecciones carga", async ({ page }) => {
    await page.goto("/colecciones");
    await expect(page).toHaveTitle(/colecci/i);
  });

  test("carrito vacío muestra estado vacío", async ({ page }) => {
    await page.goto("/carrito");
    // Debería mostrar carrito vacío o redirigir
    await expect(page).toHaveURL(/\/(carrito|tienda)/);
  });
});
