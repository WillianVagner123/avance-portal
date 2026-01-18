import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PREFIXES = ["/login", "/pending", "/logout", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ✅ MASTER sempre libera por e-mail (não depende do token.role/status)
  const masterEmail = (process.env.MASTER_EMAIL || "").toLowerCase().trim();
  const email = String(token.email).toLowerCase().trim();
  if (masterEmail && email === masterEmail) return NextResponse.next();

  const status = (token as any).status as string | undefined;

  // profissionais não-master precisam estar ACTIVE
  if (status !== "ACTIVE") {
    const url = req.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
