import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/user";
import { consumeRateLimit, userLoginLimiter, userAccountLimiter } from "@/lib/rate-limiter";
import { logSecurityEventAsync } from "@/lib/security-log";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:    process.env.AUTH_SECRET,
  session:   { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/cuenta/login",
    error:  "/cuenta/login",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email:    { label: "Email",      type: "email"    },
        password: { label: "Contraseña", type: "password" },
        ip:       { label: "IP",         type: "text"     },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const ip    = (credentials?.ip as string | undefined) ?? "unknown";

        // ── ISO 27001 A.9.4.2: Rate limit por IP ────────────
        const ipCheck = await consumeRateLimit(userLoginLimiter, ip);
        if (!ipCheck.allowed) {
          logSecurityEventAsync({
            event:   "LOGIN_BLOCKED",
            ip,
            email,
            details: { reason: "ip_rate_limit", retryAfterSeconds: ipCheck.retryAfterSeconds },
          });
          return null;
        }

        // ── Rate limit por cuenta ────────────────────────────
        const accountCheck = await consumeRateLimit(userAccountLimiter, `user:${email}`);
        if (!accountCheck.allowed) {
          logSecurityEventAsync({
            event:   "ACCOUNT_LOCKED",
            ip,
            email,
            details: { reason: "account_lockout" },
          });
          return null;
        }

        // ── Verificar credenciales ───────────────────────────
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          logSecurityEventAsync({ event: "LOGIN_FAILED", ip, email, details: { reason: "user_not_found" } });
          return null;
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          logSecurityEventAsync({ event: "LOGIN_FAILED", ip, email, userId: user.id, details: { reason: "wrong_password" } });
          return null;
        }

        // ── Login exitoso ────────────────────────────────────
        logSecurityEventAsync({ event: "LOGIN_SUCCESS", ip, email, userId: user.id });
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
