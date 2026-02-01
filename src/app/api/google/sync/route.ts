import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncUserAgendaToGoogle } from "@/lib/syncToGoogle";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.appUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserAgendaToGoogle(session.appUser.id);

  return NextResponse.json({ ok: true });
}
