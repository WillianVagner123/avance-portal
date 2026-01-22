export const runtime = "nodejs";

import CalendarClient from "../../admin/calendar/ui";

export default function ProfessionalCalendarPage() {
  return (
    <CalendarClient
      mode="professional"
      title="Meu Calendário (Konsist)"
      subtitle="Sua agenda com cores por status e busca por paciente/procedimento."
    />
  );
}
