import { NextResponse } from "next/server";

/**
 * Legacy endpoint kept for backwards compatibility.  Previously this route
 * redirected to NextAuth's Google sign‑in URL.  Now it redirects to our
 * custom authorization endpoint which initiates the Google OAuth flow for
 * calendar access.
 */
export async function GET() {
  const base = process.env.NEXTAUTH_URL || "";
  return NextResponse.redirect(new URL("/api/google/authorize", base));
}
