export const runtime = "nodejs";

import CalendarClient from "../calendar/ui";

export default function KonsistCalendarPage() {
  return (
    <CalendarClient
      mode="admin"
      title="Konsist Calendar"
      subtitle="Agenda interativa com filtros e cores por status."
    />
  );
}
