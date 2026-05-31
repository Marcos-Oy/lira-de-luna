import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight proxy — no Prisma, no heavy imports.
// Pages handle real verification via auth() / JWT on the Node.js side.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Admin routes ──────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    // Optimistic: just check the cookie exists; admin pages verify the JWT.
    const adminToken = req.cookies.get("admin_token")?.value;
    if (!adminToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Customer protected routes ─────────────────────────────
  if (
    pathname.startsWith("/cuenta") &&
    !pathname.includes("/login") &&
    !pathname.includes("/registro")
  ) {
    // Optimistic: check if the NextAuth session cookie exists.
    // Pages do the real auth() verification on their own.
    const sessionToken =
      req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/cuenta/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*"],
};
