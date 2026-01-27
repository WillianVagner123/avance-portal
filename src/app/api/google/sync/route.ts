import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function makeOAuthClient() {
  // Derive the redirect URI used when exchanging authorization codes.  If
  // GOOGLE_REDIRECT_URI is set, use it; otherwise fall back to the
  // deployed base URL with our custom callback path.  Although this
  // value isn't used during refresh token operations, it must match
  // the value used during the initial authorization.
  const baseUrl = mustEnv("NEXTAUTH_URL").replace(/\/$/, "");
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/google/callback`;
  return new google.auth.OAuth2(
    mustEnv("GOOGLE_CLIENT_ID"),
    mustEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri,
  );
}

export async function POST(req: Request) {
  const headerSecret =
    req.headers.get("x-sync-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  const envSecret = process.env.SYNC_SECRET?.trim();

  if (!headerSecret || !envSecret || headerSecret.trim() !== envSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const links = await prisma.googleCalendarLink.findMany({
    where: {
      approved: true,
      refreshToken: { not: null },
      calendarId: { not: null },
    },
    select: {
      id: true,
      userId: true,
      refreshToken: true,
      calendarId: true,
      syncToken: true,
    },
  });

  const results: any[] = [];
  const cal = google.calendar("v3");

  for (const link of links) {
    try {
      const oauth2 = makeOAuthClient();
      oauth2.setCredentials({ refresh_token: link.refreshToken! });

      const res = await cal.events.list({
        calendarId: link.calendarId!,
        auth: oauth2, // ✅ correto
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
      });

      const items = res.data.items || [];
      const nextSyncToken = res.data.nextSyncToken || null;

      for (const ev of items) {
        const evId = ev.id;
        if (!evId) continue;

        const start = (ev.start?.dateTime || ev.start?.date || null) as string | null;
        const end = (ev.end?.dateTime || ev.end?.date || null) as string | null;

        await prisma.googleCalendarEvent.upsert({
          where: { userId_googleEventId: { userId: link.userId, googleEventId: evId } },
          create: {
            userId: link.userId,
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
      }

      await prisma.googleCalendarLink.update({
        where: { id: link.id },
        data: { syncToken: nextSyncToken },
      });

      results.push({ linkId: link.id, ok: true, events: items.length });
    } catch (e: any) {
      const msg = String(e?.message || e);

      // ✅ token inválido normalmente vem como 410
      if (msg.includes("Sync token is no longer valid") || msg.includes("410")) {
        await prisma.googleCalendarLink.update({
          where: { id: link.id },
          data: { syncToken: null },
        });
      }

      results.push({ linkId: link.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: links.length, results });
}