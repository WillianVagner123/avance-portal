export const runtime = "nodejs";

import CalendarClient from "./ui";

export default function AdminCalendarPage() {
  return (
    <CalendarClient
      mode="admin"
      title="Calendário (Konsist) — Admin"
      subtitle="Agenda interativa com filtros por profissional / paciente / status e cores por status."
    />
  );
}