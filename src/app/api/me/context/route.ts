import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET() {
  const session: any = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const appUser = session.appUser || {};

  return NextResponse.json({
    ok: true,
    mode: appUser.role === "admin" ? "admin" : "professional",
    lockedProfessional: appUser.konsistMedicoNome || null,
    canChangeProfessional: appUser.role === "admin",
    google: {
      enabled: !!appUser.googleCalendar?.approved,
      calendarId: appUser.googleCalendar?.calendarId || null,
    },
  });
}
