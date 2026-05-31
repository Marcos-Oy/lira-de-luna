import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

// ── ISO 27001 A.9.4.2 — Secure Log-on Procedures ─────────────
// Todos los limitadores usan in-memory store (single-instance VPS).
// Para multi-instancia, migrar a RateLimiterRedis con la misma API.

/** Login admin: 5 intentos por IP en 15 min → bloqueo 15 min */
export const adminLoginLimiter = new RateLimiterMemory({
  keyPrefix:     "adm_login_ip",
  points:        5,
  duration:      900,   // ventana 15 min
  blockDuration: 900,   // bloqueo 15 min al superar
});

/** Bloqueo por cuenta admin: 10 intentos por email en 1 hora → bloqueo 30 min */
export const adminAccountLimiter = new RateLimiterMemory({
  keyPrefix:     "adm_login_email",
  points:        10,
  duration:      3600,
  blockDuration: 1800,
});

/** Login cliente: 10 intentos por IP en 15 min → bloqueo 30 min */
export const userLoginLimiter = new RateLimiterMemory({
  keyPrefix:     "usr_login_ip",
  points:        10,
  duration:      900,
  blockDuration: 1800,
});

/** Bloqueo por cuenta cliente: 15 intentos por email en 1 hora → bloqueo 30 min */
export const userAccountLimiter = new RateLimiterMemory({
  keyPrefix:     "usr_login_email",
  points:        15,
  duration:      3600,
  blockDuration: 1800,
});

/** Registro: 3 cuentas por IP por hora → bloqueo 1 hora */
export const registerLimiter = new RateLimiterMemory({
  keyPrefix:     "register_ip",
  points:        3,
  duration:      3600,
  blockDuration: 3600,
});

/** Reset de contraseña: 3 solicitudes por email por hora */
export const passwordResetLimiter = new RateLimiterMemory({
  keyPrefix:     "pwd_reset",
  points:        3,
  duration:      3600,
  blockDuration: 3600,
});

/** Newsletter: 5 suscripciones por IP por hora */
export const newsletterLimiter = new RateLimiterMemory({
  keyPrefix:     "newsletter_ip",
  points:        5,
  duration:      3600,
  blockDuration: 3600,
});

// ── Helper ────────────────────────────────────────────────────

export type RateLimitResult =
  | { allowed: true;  remainingPoints: number; msBeforeNext: number }
  | { allowed: false; remainingPoints: number; msBeforeNext: number; retryAfterSeconds: number };

/**
 * Consume un punto del limitador y devuelve si la solicitud está permitida.
 * Nunca lanza excepción — los errores internos del limiter se tratan como permitidos
 * para no bloquear el servicio por fallas del rate-limiter.
 */
export async function consumeRateLimit(
  limiter: RateLimiterMemory,
  key:     string,
): Promise<RateLimitResult> {
  try {
    const res = await limiter.consume(key);
    return {
      allowed:         true,
      remainingPoints: res.remainingPoints,
      msBeforeNext:    res.msBeforeNext,
    };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return {
        allowed:            false,
        remainingPoints:    err.remainingPoints,
        msBeforeNext:       err.msBeforeNext,
        retryAfterSeconds:  Math.ceil(err.msBeforeNext / 1000),
      };
    }
    // Error interno del limiter → permitir la solicitud (fail-open)
    console.error("[RateLimiter] Internal error:", err);
    return { allowed: true, remainingPoints: 0, msBeforeNext: 0 };
  }
}

/** Extrae la IP real del cliente respetando proxies de confianza. */
export function getClientIp(request: { headers: { get(name: string): string | null } }): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
