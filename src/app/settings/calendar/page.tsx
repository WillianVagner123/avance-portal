export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsCalendarPage() {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) redirect("/login");

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Vincular Google Calendar</h1>

      <div style={{ opacity: 0.85, marginBottom: 16 }}>
        Email: <b>{session.user.email}</b>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Status</div>
        {!appUser?.googleCalendar ? (
          <div style={{ opacity: 0.8 }}>Ainda sem vínculo. Clique em “Reautorizar Google”.</div>
        ) : (
          <div style={{ opacity: 0.85 }}>
            Refresh token: {appUser.googleCalendar.hasRefreshToken ? "✅" : "⚠️ ainda não (reauthorize)"}<br />
            Agenda: {appUser.googleCalendar.calendarName || "-"} ({appUser.googleCalendar.calendarId || "-"})<br />
            Aprovação do admin: {appUser.googleCalendar.approved ? "✅ Aprovado" : "⏳ Pendente"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <a
          href="/api/auth/signin/google"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Reautorizar Google (Calendar)
        </a>
        <a
          href="/settings/calendar/picker"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Escolher agenda
        </a>
      </div>

      <p style={{ opacity: 0.85 }}>
        Depois de escolher a agenda, o admin precisa aprovar o vínculo (email ↔ profissional do Konsist).
      </p>
    </div>
  );
}
