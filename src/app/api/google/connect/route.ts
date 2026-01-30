import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth = getGoogleOAuthClient();

  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  return NextResponse.redirect(url);
}
