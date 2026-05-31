import { prisma }          from "@/lib/db";
import { registerSchema }  from "@/lib/validations/user";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumeRateLimit, registerLimiter, getClientIp } from "@/lib/rate-limiter";
import { logSecurityEventAsync } from "@/lib/security-log";

export async function POST(req: NextRequest) {
  // ── ISO 27001 A.9.4.2: Rate limiting por IP ───────────────
  const ip     = getClientIp(req);
  const check  = await consumeRateLimit(registerLimiter, ip);
  if (!check.allowed) {
    logSecurityEventAsync({
      event:   "REGISTER_BLOCKED",
      ip,
      details: { reason: "ip_rate_limit", retryAfterSeconds: check.retryAfterSeconds },
    });
    return NextResponse.json(
      { error: "Demasiados intentos de registro. Intenta en unos minutos." },
      {
        status: 429,
        headers: {
          "Retry-After":           String(check.retryAfterSeconds),
          "X-RateLimit-Limit":     "3",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Este correo ya tiene una cuenta", fieldErrors: { email: ["Este correo ya tiene una cuenta"] } },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data:   { name: parsed.data.name, email, passwordHash },
    select: { id: true, email: true, name: true },
  });

  logSecurityEventAsync({ event: "REGISTER_SUCCESS", ip, email: user.email, userId: user.id });

  return NextResponse.json(user, { status: 201 });
}
