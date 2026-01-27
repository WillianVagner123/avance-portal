export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

/**
 * Initiates the Google OAuth2 flow for linking a user's calendar.  The
 * authenticated user is looked up via the session and then redirected
 * to Google's authorization endpoint with the proper scopes.  If
 * the user is not logged in they are redirected to the login page.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser: any = (session as any)?.appUser;
  if (!session?.user?.email || !appUser?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Determine the redirect URI.  The GOOGLE_REDIRECT_URI env var can
  // explicitly define the callback location.  Otherwise fall back to
  // NEXTAUTH_URL, which is set in cloudrun.env and should point to the
  // deployed site (e.g. https://yourdomain.com).
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/google/callback`;
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  );
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
  });
  return NextResponse.redirect(url);
}