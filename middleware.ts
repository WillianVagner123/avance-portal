import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/google/callback",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ libera rotas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.get("__Secure-next-auth.session-token") ||
    req.cookies.get("next-auth.session-token");

  // ❌ não logado → login
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|assets).*)"],
};
