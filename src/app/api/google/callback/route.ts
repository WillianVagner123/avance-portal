import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGoogleOAuthClient, getCalendarClient } from "@/lib/googleCalendar";
import { getPrisma } from "@/lib/getPrisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const oauth = getGoogleOAuthClient();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);

  const calendar = getCalendarClient(oauth);
  const list = await calendar.calendarList.list();

  const primary = list.data.items?.find(c => c.primary);

  const prisma = getPrisma();

  await prisma.googleCalendarLink.upsert({
    where: { userId: session.appUser.id },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      calendarId: primary?.id,
      calendarName: primary?.summary,
      approved: true,
      approvedAt: new Date(),
    },
    create: {
      userId: session.appUser.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
      calendarId: primary?.id,
      calendarName: primary?.summary,
      approved: true,
      approvedAt: new Date(),
    },
  });

  return NextResponse.redirect("/dashboard");
}
