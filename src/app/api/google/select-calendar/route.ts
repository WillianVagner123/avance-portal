export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (appUser?.status !== "ACTIVE" && appUser?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fd = await req.formData();
  const calendarId = String(fd.get("calendarId") || "");
  const calendarName = String(fd.get("calendarName") || "");

  if (!calendarId) return NextResponse.json({ error: "Missing calendarId" }, { status: 400 });

  await prisma.googleCalendarLink.upsert({
    where: { userId: appUser.id },
    create: { userId: appUser.id, calendarId, calendarName, approved: false },
    update: { calendarId, calendarName, approved: false },
  });

  return NextResponse.redirect(new URL("/settings/calendar", req.url));
}
