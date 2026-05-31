import { defineConfig, devices } from "@playwright/test";

/**
 * Configuración de Playwright para pruebas E2E.
 * Ejecutar con:  npx playwright test
 * Ver reporte:   npx playwright show-report
 * Modo UI:       npx playwright test --ui
 */
export default defineConfig({
  testDir:       "./e2e",
  fullyParallel: false, // secuencial — el rate-limiter es in-memory
  forbidOnly:    !!process.env.CI,
  retries:       process.env.CI ? 1 : 0,
  workers:       1,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL:    process.env.TEST_BASE_URL || "http://localhost:3000",
    trace:      "on-first-retry",
    screenshot: "only-on-failure",
    video:      "on-first-retry",
    locale:     "es-CL",
  },

  projects: [
    {
      name: "chromium",
      use:  { ...devices["Desktop Chrome"] },
    },
  ],

  // Reutiliza el servidor de desarrollo si ya está corriendo.
  // Si no está corriendo, lo levanta automáticamente.
  webServer: {
    command:             "npm run dev",
    url:                 "http://localhost:3000",
    reuseExistingServer: true,
    timeout:             120_000,
  },
});
