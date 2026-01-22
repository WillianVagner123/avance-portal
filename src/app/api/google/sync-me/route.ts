export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function makeOAuthClient() {
  const baseUrl = mustEnv("NEXTAUTH_URL").replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/auth/callback/google`;
  return new google.auth.OAuth2(
    mustEnv("GOOGLE_CLIENT_ID"),
    mustEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri
  );
}

export async function POST() {
  const session: any = await getServerSession(authOptions);
  const appUser = session?.appUser;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!appUser || (appUser.status !== "ACTIVE" && appUser.role !== "MASTER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const link = await prisma.googleCalendarLink.findUnique({ where: { userId: appUser.id } });
  if (!link?.approved) {
    return NextResponse.json({ ok: false, error: "calendar_not_approved" }, { status: 403 });
  }
  if (!link.refreshToken || !link.calendarId) {
    return NextResponse.json({ ok: false, error: "missing_refresh_or_calendar" }, { status: 400 });
  }

  const cal = google.calendar("v3");
  try {
    const oauth2 = makeOAuthClient();
    oauth2.setCredentials({ refresh_token: link.refreshToken });

    const res = await cal.events.list({
      calendarId: link.calendarId,
      auth: oauth2,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
      syncToken: link.syncToken || undefined,
      timeMin: link.syncToken
        ? undefined
        : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      timeMax: link.syncToken
        ? undefined
        : new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(),
      showDeleted: true,
    });

    const items = res.data.items || [];
    const nextSyncToken = res.data.nextSyncToken || null;

    let upserted = 0;
    let deleted = 0;

    await prisma.$transaction(async (tx) => {
      for (const ev of items) {
        const evId = ev.id;
        if (!evId) continue;

        // Se veio como deletado/cancelado, apaga do banco
        if (ev.status === "cancelled") {
          await tx.googleCalendarEvent
            .delete({ where: { userId_googleEventId: { userId: appUser.id, googleEventId: evId } } })
            .catch(() => null);
          deleted++;
          continue;
        }

        const start = (ev.start?.dateTime || ev.start?.date || null) as string | null;
        const end = (ev.end?.dateTime || ev.end?.date || null) as string | null;

        await tx.googleCalendarEvent.upsert({
          where: { userId_googleEventId: { userId: appUser.id, googleEventId: evId } },
          create: {
            userId: appUser.id,
            googleEventId: evId,
            calendarId: link.calendarId!,
            status: ev.status || null,
            summary: ev.summary || null,
            start: start ? new Date(start) : null,
            end: end ? new Date(end) : null,
            updated: ev.updated ? new Date(ev.updated) : null,
            raw: ev as any,
          },
          update: {
            calendarId: link.calendarId!,
            status: ev.status || null,
            summary: ev.summary || null,
            start: start ? new Date(start) : null,
            end: end ? new Date(end) : null,
            updated: ev.updated ? new Date(ev.updated) : null,
            raw: ev as any,
          },
        });
        upserted++;
      }

      // limpeza: se o usuário trocou de agenda, remove eventos antigos
      await tx.googleCalendarEvent.deleteMany({
        where: { userId: appUser.id, calendarId: { not: link.calendarId! } },
      });

      await tx.googleCalendarLink.update({
        where: { userId: appUser.id },
        data: { syncToken: nextSyncToken },
      });
    });

    return NextResponse.json({ ok: true, items: items.length, upserted, deleted, nextSyncToken: !!nextSyncToken });
  } catch (e: any) {
    const msg = String(e?.message || e);

    // token inválido normalmente vem como 410
    if (msg.includes("Sync token is no longer valid") || msg.includes("410")) {
      await prisma.googleCalendarLink.update({ where: { userId: appUser.id }, data: { syncToken: null } });
    }

    // se perdeu acesso / refresh token inválido
    if (msg.toLowerCase().includes("invalid_grant") || msg.toLowerCase().includes("unauthorized")) {
      await prisma.$transaction(async (tx) => {
        await tx.googleCalendarLink.update({ where: { userId: appUser.id }, data: { approved: false, syncToken: null } });
        await tx.googleCalendarEvent.deleteMany({ where: { userId: appUser.id } });
      });
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
