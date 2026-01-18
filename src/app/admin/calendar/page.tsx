export const runtime = "nodejs";

import CalendarClient from "./ui";

export default function AdminCalendarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-pink-100 to-rose-200">
      <CalendarClient
        mode="admin"
        title="Calendário (Konsist)"
        subtitle="Agenda interativa com filtros e detalhe por agendamento."
      />
    </div>
  );
}
