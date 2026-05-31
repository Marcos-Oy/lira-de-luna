import { test, expect } from "@playwright/test";

/**
 * Suite: HTTP Security Headers
 * Valida que los headers de seguridad ISO 27001 A.13.1 estén presentes
 * en todas las respuestas de la aplicación.
 */
test.describe("Security Headers", () => {
  test("presencia de X-Content-Type-Options", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("presencia de X-Frame-Options (anti-clickjacking)", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });

  test("presencia de X-XSS-Protection", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-xss-protection"]).toBe("1; mode=block");
  });

  test("presencia de Referrer-Policy", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("presencia de Permissions-Policy", async ({ request }) => {
    const res = await request.get("/");
    const policy = res.headers()["permissions-policy"];
    expect(policy).toBeTruthy();
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
  });

  test("presencia de Content-Security-Policy", async ({ request }) => {
    const res = await request.get("/");
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("form-action 'self'");
  });

  test("headers presentes también en rutas de API", async ({ request }) => {
    const res = await request.get("/api/auth/register", { failOnStatusCode: false });
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("headers presentes en rutas del admin", async ({ request }) => {
    const res = await request.get("/admin/login", { failOnStatusCode: false });
    expect(res.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });
});
