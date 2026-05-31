import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const response = NextResponse.redirect(`${base}/cuenta/login`, { status: 302 });

  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "__Host-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  for (const name of names) {
    // Sobreescribir con cookie expirada — la forma más compatible de borrarla
    response.cookies.set(name, "", {
      maxAge: 0,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}
