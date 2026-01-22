"use client";
import { useEffect, useState } from "react";

type Cal = { id: string; summary: string; primary: boolean; accessRole?: string };

export default function PickerClient() {
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/google/calendars", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Falha ao carregar");
        setCalendars(j.calendars || []);
        setSelectedId(j.selected?.id || "");
        setApproved(!!j.approved);
      } catch (e: any) {
        alert(e?.message || "Erro");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Carregando…</div>;

  const selectedName = calendars.find((c) => c.id === selectedId)?.summary || "";

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <h1 className="text-lg font-black mb-2">Selecione sua agenda</h1>

      <div className="text-sm text-white/70 mb-4">
        Aprovação do admin: {approved ? "✅ Aprovado" : "⏳ Pendente"}
      </div>

      <form method="post" action="/api/google/select-calendar" className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <select
          name="calendarId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full sm:flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="">-- Escolha --</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.primary ? "⭐ " : ""}
              {c.summary} ({c.accessRole})
            </option>
          ))}
        </select>

        <input type="hidden" name="calendarName" value={selectedName} />

        <div className="flex gap-3">
          <button type="submit" className="rounded-xl border border-white/10 bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700">
            Salvar
          </button>
          <a href="/settings/calendar" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold hover:bg-white/10">
            Voltar
          </a>
        </div>
      </form>
    </div>
  );
}
