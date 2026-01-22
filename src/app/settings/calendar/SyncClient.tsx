"use client";

import { useState } from "react";

export default function SyncClient() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function syncNow() {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/google/sync-me", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Falha ao sincronizar");
      setMsg(`✅ Sincronizado. Itens: ${j.items} | Atualizados: ${j.upserted} | Removidos: ${j.deleted}`);
    } catch (e: any) {
      setMsg(`⚠️ ${e?.message || "Erro"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="font-extrabold mb-2">Sincronização manual</div>
      <div className="text-sm text-white/70 mb-3">
        Útil para forçar atualização imediata (e remover eventos que foram apagados da sua agenda).
      </div>
      <button
        type="button"
        onClick={syncNow}
        disabled={loading}
        className="rounded-xl border border-white/10 bg-blue-600 px-4 py-2 text-sm font-extrabold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Sincronizando…" : "Sincronizar agora"}
      </button>
      {msg ? <div className="mt-3 text-sm">{msg}</div> : null}
    </div>
  );
}
