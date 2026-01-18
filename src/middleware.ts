import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIX = [
  "/login",
  "/pending",
  "/api/auth",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  if (PUBLIC_PREFIX.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = (token as any)?.role;
  const status = (token as any)?.status;

  // MASTER vê tudo
  if (role === "MASTER") return NextResponse.next();

  // PROFESSIONAL (não-master)
  if (status !== "ACTIVE") {
    // deixa permitir settings/calendar se você quiser (mantive liberado)
    if (pathname.startsWith("/settings/calendar") || pathname.startsWith("/api/google")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/pending", req.url));
  }

  // PROFESSIONAL ACTIVE: não entra em /admin
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
