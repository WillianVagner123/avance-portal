export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SyncClient from "./SyncClient";

export default async function SettingsCalendarPage() {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <h1 className="text-xl font-black mb-2">Vincular Google Calendar</h1>

      <div className="text-sm text-white/70 mb-4">
        Email: <b>{session.user.email}</b>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
        <div className="font-extrabold mb-2">Status</div>
        {!appUser?.googleCalendar ? (
          <div className="text-sm text-white/70">Ainda sem vínculo. Clique em “Reautorizar Google”.</div>
        ) : (
          <div className="text-sm text-white/75">
            Refresh token: {appUser.googleCalendar.hasRefreshToken ? "✅" : "⚠️ ainda não (reauthorize)"}<br />
            Agenda: {appUser.googleCalendar.calendarName || "-"} ({appUser.googleCalendar.calendarId || "-"})<br />
            Aprovação do admin: {appUser.googleCalendar.approved ? "✅ Aprovado" : "⏳ Pendente"}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap mb-4">
        <a
          href="/api/auth/signin/google"
          className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold hover:bg-white/10"
        >
          Reautorizar Google (Calendar)
        </a>
        <a
          href="/settings/calendar/picker"
          className="inline-block rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold hover:bg-white/10"
        >
          Escolher agenda
        </a>
      </div>

      {appUser?.googleCalendar?.approved ? (
        <div className="mb-4">
          <SyncClient />
        </div>
      ) : null}

      <p className="text-sm text-white/70">
        Depois de escolher a agenda, o admin precisa aprovar o vínculo (email ↔ profissional do Konsist).
      </p>
    </div>
  );
}
