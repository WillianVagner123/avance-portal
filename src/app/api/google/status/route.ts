import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  const appUser = session?.appUser;

  if (!session?.user?.email || !appUser?.id) {
    return NextResponse.json({ linked: false, approved: false });
  }

  const link = await prisma.googleCalendarLink.findUnique({ where: { userId: appUser.id } });

  return NextResponse.json({
    linked: !!link?.refreshToken,
    approved: !!link?.approved,
    calendarId: link?.calendarId || null,
    calendarName: link?.calendarName || null,
  });
}
