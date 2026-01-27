export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

/**
 * Handles the redirect from Google after a user grants calendar access.  The
 * authorization code is exchanged for access and refresh tokens, which are
 * persisted to the googleCalendarLink table.  Users must be logged in to
 * complete the linking process.  Upon success the user is redirected back
 * to the calendar settings page.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser: any = (session as any)?.appUser;
  if (!session?.user?.email || !appUser?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/settings/calendar?error=oauth", req.url));
  }
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/google/callback`;
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  );
  try {
    const { tokens } = await oauth2.getToken(code);
    await prisma.googleCalendarLink.upsert({
      where: { userId: appUser.id },
      create: {
        userId: appUser.id,
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        approved: false,
      },
      update: {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token ?? undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  } catch (e) {
    console.error("Failed to exchange Google OAuth code", e);
    return NextResponse.redirect(new URL("/settings/calendar?error=oauth", req.url));
  }
  return NextResponse.redirect(new URL("/settings/calendar", req.url));
}