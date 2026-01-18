export const runtime = "nodejs";

import CalendarPretty from "./CalendarPretty";

export default function AdminCalendarPage() {
  return (
    <CalendarPretty
      mode="admin"
      title="Calendário — Admin"
      subtitle="Agenda do dia (Konsist) com filtros e resumo por status."
    />
  );
}
