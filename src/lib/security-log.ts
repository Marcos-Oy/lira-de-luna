import { prisma } from "@/lib/db";

// ── ISO 27001 A.12.4.1 — Event Logging ───────────────────────

export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGIN_BLOCKED"
  | "ADMIN_LOGIN_SUCCESS"
  | "ADMIN_LOGIN_FAILED"
  | "ADMIN_LOGIN_BLOCKED"
  | "REGISTER_SUCCESS"
  | "REGISTER_BLOCKED"
  | "RATE_LIMIT_EXCEEDED"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_CHANGED"
  | "SUSPICIOUS_ACTIVITY";

export type SecuritySeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

const SEVERITY_MAP: Record<SecurityEventType, SecuritySeverity> = {
  LOGIN_SUCCESS:         "INFO",
  LOGIN_FAILED:          "WARNING",
  LOGIN_BLOCKED:         "ERROR",
  ADMIN_LOGIN_SUCCESS:   "INFO",
  ADMIN_LOGIN_FAILED:    "WARNING",
  ADMIN_LOGIN_BLOCKED:   "CRITICAL",
  REGISTER_SUCCESS:      "INFO",
  REGISTER_BLOCKED:      "WARNING",
  RATE_LIMIT_EXCEEDED:   "ERROR",
  ACCOUNT_LOCKED:        "CRITICAL",
  PASSWORD_RESET_REQUEST:"INFO",
  PASSWORD_CHANGED:      "INFO",
  SUSPICIOUS_ACTIVITY:   "CRITICAL",
};

/**
 * Registra un evento de seguridad en la BD.
 * Fire-and-forget — nunca falla la petición principal si el log falla.
 * ISO 27001 A.12.4.1: Event logging
 * ISO 27001 A.12.4.2: Protection of log information (append-only, sin endpoint de borrado)
 */
export async function logSecurityEvent(data: {
  event:      SecurityEventType;
  ip?:        string;
  userAgent?: string;
  email?:     string;
  userId?:    string;
  adminId?:   string;
  details?:   Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.securityLog.create({
      data: {
        event:    data.event,
        severity: SEVERITY_MAP[data.event] ?? "INFO",
        ip:       data.ip        ?? null,
        userAgent:data.userAgent ?? null,
        email:    data.email     ?? null,
        userId:   data.userId    ?? null,
        adminId:  data.adminId   ?? null,
        details:  (data.details as never) ?? undefined,
      },
    });
  } catch (err) {
    // Nunca fallar la request por un error de logging
    console.error("[SecurityLog] write error:", err);
  }
}

/** Versión fire-and-forget sin await — usar cuando el log no puede bloquear la respuesta. */
export function logSecurityEventAsync(data: Parameters<typeof logSecurityEvent>[0]): void {
  logSecurityEvent(data).catch(() => {});
}
