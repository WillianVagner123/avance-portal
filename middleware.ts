import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = [
  "/login",
  "/pending",
  "/logout",
  "/api/auth",
  "/favicon.ico",
  "/api/google/sync",
  // Allow the custom OAuth routes for linking Google calendars to bypass
  // authentication.  These endpoints implement their own session
  // checks and must remain reachable by Google's redirect callbacks.
  "/api/google/authorize",
  "/api/google/callback",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p) || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
