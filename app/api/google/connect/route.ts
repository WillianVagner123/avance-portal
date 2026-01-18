import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  // redireciona pro fluxo do NextAuth Google
  return NextResponse.redirect(new URL("/api/auth/signin/google", base));
}
