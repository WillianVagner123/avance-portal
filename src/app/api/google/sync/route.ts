import { NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

async function getAccessTokenFromRefresh(refreshToken: string) {
  const oauth2 = new google.auth.OAuth2(
    mustEnv("GOOGLE_CLIENT_ID"),
    mustEnv("GOOGLE_CLIENT_SECRET"),
    mustEnv("GOOGLE_REDIRECT_URI") // ex: https://SEU_DOMINIO/api/auth/callback/google
  );

  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error("No access token from refresh");
  return token;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // ✅ pega todos os profissionais aprovados com refresh_token
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

  for (const link of links) {
    try {
      const accessToken = await getAccessTokenFromRefresh(link.refreshToken!);

      const cal = google.calendar("v3");
      const res = await cal.events.list({
        calendarId: link.calendarId!,
        auth: accessToken,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
        // ✅ incremental: se existir syncToken, usa; senão faz full (limitado)
        syncToken: link.syncToken || undefined,
        timeMin: link.syncToken ? undefined : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 dias atrás
        timeMax: link.syncToken ? undefined : new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 dias à frente
      });

      const items = res.data.items || [];
      const nextSyncToken = res.data.nextSyncToken || null;

      // ✅ grava/atualiza eventos no banco (tabela: GoogleCalendarEvent)
      // Se você ainda não tem, eu te passo o Prisma model logo abaixo.
      for (const ev of items) {
        const evId = ev.id || null;
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

      // ✅ salva syncToken pra próxima execução ser incremental
      await prisma.googleCalendarLink.update({
        where: { id: link.id },
        data: { syncToken: nextSyncToken },
      });

      results.push({ linkId: link.id, ok: true, events: items.length });
    } catch (e: any) {
      // se o syncToken expirar, apaga pra forçar full no próximo run
      const msg = String(e?.message || e);
      if (msg.includes("Sync token is no longer valid")) {
        await prisma.googleCalendarLink.update({ where: { id: link.id }, data: { syncToken: null } });
      }
      results.push({ linkId: link.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: links.length, results });
}
