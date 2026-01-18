export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (appUser?.status !== "ACTIVE" && appUser?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await prisma.googleCalendarLink.findUnique({ where: { userId: appUser.id } });
  if (!link?.accessToken) return NextResponse.json({ error: "Sem token do Google (reauthorize)" }, { status: 400 });

  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!);
  oauth2.setCredentials({ access_token: link.accessToken, refresh_token: link.refreshToken || undefined });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  const list = await cal.calendarList.list();

  const calendars = (list.data.items || []).map((c) => ({
    id: c.id!,
    summary: c.summary || c.id!,
    primary: !!c.primary,
    accessRole: c.accessRole,
  }));

  return NextResponse.json({
    calendars,
    selected: { id: link.calendarId, name: link.calendarName },
    approved: link.approved,
  });
}
