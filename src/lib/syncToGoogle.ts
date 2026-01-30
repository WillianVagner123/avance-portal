import { getPrisma } from "@/lib/getPrisma";
import { getGoogleOAuthClient, getCalendarClient } from "@/lib/googleCalendar";

export async function syncUserAgendaToGoogle(userId: string) {
  const prisma = getPrisma();

  const link = await prisma.googleCalendarLink.findUnique({
    where: { userId },
  });
  if (!link || !link.refreshToken) return;

  const oauth = getGoogleOAuthClient();
  oauth.setCredentials({
    access_token: link.accessToken,
    refresh_token: link.refreshToken,
  });

  const calendar = getCalendarClient(oauth);

  const agendas = await prisma.agendas.findMany({
    where: {
      agendamento_medico: {
        contains: link.calendarName ?? "",
      },
    },
  });

  for (const a of agendas) {
    await calendar.events.insert({
      calendarId: link.calendarId!,
      requestBody: {
        summary: a.paciente ?? "Consulta",
        description: a.agendamento_procedimento ?? "",
        start: {
          dateTime: `${a.agendamento_data?.toISOString().slice(0, 10)}T${a.agendamento_hora
            ?.toISOString()
            .slice(11, 19)}`,
        },
        end: {
          dateTime: `${a.agendamento_data?.toISOString().slice(0, 10)}T${a.agendamento_hora
            ?.toISOString()
            .slice(11, 19)}`,
        },
      },
    });
  }
}
