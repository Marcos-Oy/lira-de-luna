import { AdminUserModel }   from "@/models/admin-user.model";
import { adminLoginSchema } from "@/lib/validations/admin";
import { NextResponse }     from "next/server";
import bcrypt from "bcryptjs";
import jwt    from "jsonwebtoken";
import { cookies } from "next/headers";
import {
  consumeRateLimit,
  adminLoginLimiter,
  adminAccountLimiter,
} from "@/lib/rate-limiter";
import { logSecurityEvent } from "@/lib/security-log";

const JWT_SECRET  = process.env.ADMIN_JWT_SECRET!;
const COOKIE_NAME = "admin_token";

export type AdminJWTPayload = {
  adminId:     string;
  email:       string;
  name:        string;
  role:        string;
  permissions: string[];
};

// ── ISO 27001 A.9.4.2 — Respuesta genérica en fallos ─────────
// Siempre "Credenciales inválidas" para no revelar si el email existe.
const INVALID_CREDS = NextResponse.json(
  { error: "Credenciales inválidas" },
  { status: 401 },
);

export const AdminAuthController = {
  login: async (body: unknown, ipAddress?: string) => {
    const userAgent = undefined; // se podría pasar desde la request si se necesita

    // ── 1. Validar schema ─────────────────────────────────────
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });

    const email = parsed.data.email.toLowerCase().trim();
    const ip    = ipAddress ?? "unknown";

    // ── 2. Rate limit por IP (ISO 27001 A.9.4.2) ─────────────
    const ipCheck = await consumeRateLimit(adminLoginLimiter, ip);
    if (!ipCheck.allowed) {
      await logSecurityEvent({
        event:   "ADMIN_LOGIN_BLOCKED",
        ip,
        email,
        details: { reason: "ip_rate_limit", retryAfterSeconds: ipCheck.retryAfterSeconds },
      });
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        {
          status: 429,
          headers: {
            "Retry-After":        String(ipCheck.retryAfterSeconds),
            "X-RateLimit-Limit":  "5",
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // ── 3. Rate limit por cuenta (bloqueo de cuenta) ──────────
    const accountCheck = await consumeRateLimit(adminAccountLimiter, `admin:${email}`);
    if (!accountCheck.allowed) {
      await logSecurityEvent({
        event:   "ACCOUNT_LOCKED",
        ip,
        email,
        details: { reason: "account_lockout", retryAfterSeconds: accountCheck.retryAfterSeconds },
      });
      return NextResponse.json(
        { error: "Cuenta bloqueada temporalmente por múltiples intentos fallidos." },
        { status: 429, headers: { "Retry-After": String(accountCheck.retryAfterSeconds) } },
      );
    }

    // ── 4. Verificar credenciales ─────────────────────────────
    const admin = await AdminUserModel.findByEmail(email);
    if (!admin || !admin.isActive) {
      await logSecurityEvent({ event: "ADMIN_LOGIN_FAILED", ip, email, details: { reason: "user_not_found" } });
      return INVALID_CREDS;
    }

    const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!valid) {
      await logSecurityEvent({ event: "ADMIN_LOGIN_FAILED", ip, email, adminId: admin.id, details: { reason: "wrong_password" } });
      return INVALID_CREDS;
    }

    // ── 5. Login exitoso: limpiar contadores + registrar ──────
    await AdminUserModel.updateLastLogin(admin.id);
    await AdminUserModel.createAuditLog({
      adminUserId: admin.id,
      action:      "LOGIN",
      resource:    "AdminUser",
      resourceId:  admin.id,
      ipAddress:   ip,
    });
    await logSecurityEvent({
      event:   "ADMIN_LOGIN_SUCCESS",
      ip,
      email,
      adminId: admin.id,
    });

    // ── 6. Emitir JWT en cookie httpOnly ──────────────────────
    const payload: AdminJWTPayload = {
      adminId:     admin.id,
      email:       admin.email,
      name:        admin.name,
      role:        admin.role,
      permissions: admin.permissions as string[],
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      path:     "/",
      maxAge:   60 * 60 * 2,
    });

    return NextResponse.json({
      id:          admin.id,
      name:        admin.name,
      email:       admin.email,
      role:        admin.role,
      permissions: admin.permissions,
    });
  },

  logout: async () => {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return NextResponse.json({ success: true });
  },

  me: async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    try {
      const payload = jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
      const admin   = await AdminUserModel.findById(payload.adminId);
      if (!admin || !admin.isActive)
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });

      return NextResponse.json({
        id:          admin.id,
        name:        admin.name,
        email:       admin.email,
        role:        admin.role,
        permissions: admin.permissions as string[],
      });
    } catch {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
  },
};

export function verifyAdminToken(token: string): AdminJWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminJWTPayload;
  } catch {
    return null;
  }
}
