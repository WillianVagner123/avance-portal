import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Rotas públicas (não exigem login)
const PUBLIC_PREFIXES = ["/login", "/pending", "/logout", "/api/auth", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Assets / next internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  // Rotas públicas
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ✅ Só valida autenticação no middleware.
  //    Status/role (PENDING/ACTIVE/MASTER) fica 100% no server (getServerSession + DB),
  //    porque o token do middleware não atualiza automaticamente quando o admin aprova.
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
