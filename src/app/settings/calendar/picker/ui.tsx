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

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;

  const selectedName = calendars.find((c) => c.id === selectedId)?.summary || "";

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>Selecione sua agenda</h1>

      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Aprovação do admin: {approved ? "✅ Aprovado" : "⏳ Pendente"}
      </div>

      <form
        method="post"
        action="/api/google/select-calendar"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <select
          name="calendarId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: 10, borderRadius: 10, minWidth: 360 }}
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
        <button type="submit" style={{ padding: "10px 12px", borderRadius: 10 }}>
          Salvar
        </button>
        <a
          href="/settings/calendar"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Voltar
        </a>
      </form>
    </div>
  );
}
