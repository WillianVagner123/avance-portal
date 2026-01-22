"use client";

import CalendarPretty from "@/components/calendar/CalendarPretty";

export default function AdminCalendarPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <CalendarPretty
        mode="admin"
        title="Agenda Geral"
        subtitle="Visão administrativa"
      />
    </div>
  );
}
