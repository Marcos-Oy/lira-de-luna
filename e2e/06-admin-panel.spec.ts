import { test, expect } from "@playwright/test";
import { loginAdmin } from "./helpers/auth";

/**
 * Suite: Panel de administración
 * Verifica que las secciones principales del admin carguen y funcionen.
 */
test.describe("Panel de administración", () => {

  // Login antes de cada prueba de este grupo
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("dashboard principal carga con KPIs", async ({ page }) => {
    await page.goto("/admin");
    // El dashboard debe mostrar alguna métrica
    await expect(page.locator("main, [role='main']")).toBeVisible({ timeout: 8_000 });
  });

  test("lista de productos carga con paginación", async ({ page }) => {
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/productos/);
    await expect(page.locator("table, [role='table']").or(page.getByText(/producto/i)).first())
      .toBeVisible({ timeout: 8_000 });
  });

  test("búsqueda de productos en admin actualiza resultados", async ({ page }) => {
    await page.goto("/admin/productos");

    const searchInput = page.locator('input[placeholder*="buscar"], input[placeholder*="Buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("collar");
      await searchInput.press("Enter");
      await page.waitForURL("**/admin/productos?**q=collar**", { timeout: 5_000 });
      expect(new URL(page.url()).searchParams.get("q")).toBe("collar");
    }
  });

  test("lista de pedidos carga", async ({ page }) => {
    await page.goto("/admin/pagos");
    await expect(page).toHaveURL(/\/admin\/pagos/);
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
  });

  test("colecciones admin carga", async ({ page }) => {
    await page.goto("/admin/colecciones");
    await expect(page.getByRole("button", { name: /nueva colección|agregar/i }))
      .toBeVisible({ timeout: 8_000 });
  });

  test("modal de nueva colección abre correctamente", async ({ page }) => {
    await page.goto("/admin/colecciones");

    const newBtn = page.getByRole("button", { name: /nueva colección|nueva|agregar/i }).first();
    await newBtn.click();

    // El modal debe tener el selector de tipo de colección (CollectionType)
    await expect(page.locator("select").filter({ hasText: /joyería|insumo/i }))
      .toBeVisible({ timeout: 5_000 });
  });

  test("configuración admin carga", async ({ page }) => {
    await page.goto("/admin/configuracion");
    await expect(page.locator("form, main")).toBeVisible({ timeout: 8_000 });
  });

  test("logs de seguridad cargan con KPIs", async ({ page }) => {
    await page.goto("/admin/seguridad");
    await expect(page.getByText(/logs de seguridad/i)).toBeVisible({ timeout: 8_000 });
    // Los 4 KPIs del día deben estar visibles
    await expect(page.getByText(/eventos hoy/i)).toBeVisible({ timeout: 5_000 });
  });

  test("auditoría admin carga correctamente", async ({ page }) => {
    await page.goto("/admin/seguridad/auditoria");
    await expect(page.getByText(/auditoría/i)).toBeVisible({ timeout: 8_000 });
  });

  test("logs de seguridad registran el login del admin", async ({ page }) => {
    await page.goto("/admin/seguridad");

    // Debe haber al menos 1 evento de login exitoso (el que acabamos de hacer)
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // El primer evento debe ser un login admin exitoso
    const firstRow = rows.first();
    await expect(firstRow).toContainText(/admin login|login/i);
  });

  test("filtros de logs de seguridad funcionan", async ({ page }) => {
    await page.goto("/admin/seguridad");

    // Filtrar por evento ADMIN_LOGIN_SUCCESS
    const eventSelect = page.locator("select").first();
    await eventSelect.selectOption("ADMIN_LOGIN_SUCCESS");

    await page.click('button[type="submit"]');
    await page.waitForURL("**/seguridad?**event=ADMIN_LOGIN_SUCCESS**", { timeout: 5_000 });

    const url = new URL(page.url());
    expect(url.searchParams.get("event")).toBe("ADMIN_LOGIN_SUCCESS");
  });

  test("panel de usuarios admin carga", async ({ page }) => {
    await page.goto("/admin/usuarios");
    await expect(page.locator("main, table")).toBeVisible({ timeout: 8_000 });
  });

  test("módulo de finanzas carga", async ({ page }) => {
    await page.goto("/admin/finanzas");
    await expect(page.locator("main")).toBeVisible({ timeout: 8_000 });
  });
});
