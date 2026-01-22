"use client";

import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

type KonsistItem = any;

type Mode = "admin" | "professional";

type Props = {
  mode: Mode;
  title?: string;
  subtitle?: string;
};

function cx(...a: Array<string | false | undefined | null>) {
  return a.filter(Boolean).join(" ");
}

function toISODate(d: Date) {
  // YYYY-MM-DD (local)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function statusColor(status: string) {
  const s = (status || "").toLowerCase();
  // Ajuste as palavras conforme o Konsist usa (confirmado, cancelado, etc)
  if (s.includes("cancel")) return "#ef4444";      // red-500
  if (s.includes("falta")) return "#f97316";       // orange-500
  if (s.includes("confirm")) return "#22c55e";     // green-500
  if (s.includes("agend")) return "#3b82f6";       // blue-500
  if (s.includes("atend")) return "#a855f7";       // purple-500
  return "#64748b"; // slate-500
}

export default function CalendarClient({ mode, title, subtitle }: Props) {
  const [tab, setTab] = useState<"agenda" | "filtros" | "status" | "links">("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [raw, setRaw] = useState<KonsistItem[]>([]);
  const [prof, setProf] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Range padrão: hoje até +4
  const [datai, setDatai] = useState<string>("");
  const [dataf, setDataf] = useState<string>("");



  async function carregar() {
    if (!datai || !dataf) return;

    setError("");
    setLoading(true);


    try {
      const qs = new URLSearchParams({
        datai,
        dataf,
        // opcional (se você quiser filtrar no backend depois)
        prof: prof === "ALL" ? "" : prof,
        status: status === "ALL" ? "" : status,
        q: search || "",
        mode,
      });

      const res = await fetch(`/api/konsist/agendamentos?${qs.toString()}`, {
        cache: "no-store",
      });

      const rawText = await res.text();
      let json: any = null;

      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(`Resposta não-JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
      }

      if (!res.ok || !json?.ok) {
        const msg =
          json?.error
            ? `${json.error}${json.status ? ` (${json.status})` : ""}`
            : `HTTP ${res.status}`;
        const body = json?.body ? `\n${String(json.body).slice(0, 400)}` : "";
        throw new Error(msg + body);
      }

      // O Konsist costuma vir tipo { Resultado: [...] } ou algo semelhante.
      // Você já mostrou no terminal: RAW(200) tinha { "Resultado": [ ... ] }
      const items = Array.isArray(json?.data?.Resultado)
        ? json.data.Resultado
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.resultado)
            ? json.data.resultado
            : [];

      setRaw(items);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar");
      setRaw([]);
    } finally {
      setLoading(false);
    }
  }
// 🔐 Inicializa datas apenas no client (evita hydration mismatch)
useEffect(() => {
  const di = toISODate(new Date());
  const df = toISODate(addDays(new Date(), 4));
  setDatai(di);
  setDataf(df);
}, []);

// 🔁 Carrega agenda somente quando datas existirem
useEffect(() => {
  if (!datai || !dataf) return;
  carregar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [datai, dataf]);

  // Extrair listas (se existir campo)
  const professionals = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((x) => {
      const p = x?.profissional || x?.profissional_nome || x?.profissionalNome || x?.medico || x?.nutricionista;
      if (p) set.add(String(p));
    });
    return ["ALL", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  }, [raw]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((x) => {
      const s = x?.status || x?.situacao || x?.status_nome || x?.statusNome;
      if (s) set.add(String(s));
    });
    return ["ALL", ...Array.from(set).sort((a,b)=>a.localeCompare(b))];
  }, [raw]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    return raw.filter((x) => {
      const p = String(x?.profissional || x?.profissional_nome || x?.profissionalNome || "").toLowerCase();
      const s = String(x?.status || x?.situacao || x?.status_nome || x?.statusNome || "").toLowerCase();
      const paciente = String(x?.paciente || x?.nomepaciente || x?.Paciente || "").toLowerCase();
      const proc = String(x?.procedimento || x?.procedimentos || x?.procedimento_nome || "").toLowerCase();

      if (prof !== "ALL") {
        const pRaw = String(x?.profissional || x?.profissional_nome || x?.profissionalNome || "");
        if (pRaw !== prof) return false;
      }
      if (status !== "ALL") {
        const sRaw = String(x?.status || x?.situacao || x?.status_nome || x?.statusNome || "");
        if (sRaw !== status) return false;
      }
      if (q) {
        const hay = `${paciente} ${proc} ${p} ${s}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [raw, prof, status, search]);

  const events = useMemo(() => {
    // ✅ ajuste aqui conforme seus campos do Konsist
    return filtered.map((x, idx) => {
      const id = x?.id || x?.idagendamento || x?.agendamento_chave || `${idx}`;

      const paciente = x?.paciente || x?.nomepaciente || x?.Paciente || "Paciente";
      const proc = x?.procedimento || x?.procedimento_nome || "";
      const profNome = x?.profissional || x?.profissional_nome || x?.profissionalNome || "";
      const st = x?.status || x?.situacao || x?.status_nome || x?.statusNome || "";

      const start =
        x?.inicio ||
        x?.datahora_inicio ||
        x?.dataHoraInicio ||
        x?.data_inicio ||
        x?.dataHora ||
        x?.data;

      const end =
        x?.fim ||
        x?.datahora_fim ||
        x?.dataHoraFim ||
        x?.data_fim;

      const title =
        mode === "admin"
          ? `${paciente}${proc ? ` — ${proc}` : ""}${profNome ? ` • ${profNome}` : ""}`
          : `${paciente}${proc ? ` — ${proc}` : ""}`;

      const color = statusColor(String(st));

      return {
        id: String(id),
        title,
        start: start,
        end: end || start,
        backgroundColor: color,
        borderColor: color,
        textColor: "#0b1020",
        extendedProps: {
          paciente,
          procedimento: proc,
          profissional: profNome,
          status: st,
          raw: x,
        },
      };
    });
  }, [filtered, mode]);

  return (
    <div className="min-h-[calc(100vh-1px)] w-full bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {title || (mode === "admin" ? "Calendário (Admin)" : "Meu Calendário")}
            </h1>
            <p className="text-sm text-slate-400">
              {subtitle || "Agenda interativa com filtros por profissional / paciente / status e cores por status."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
              Range: <span className="font-semibold">{datai}</span> → <span className="font-semibold">{dataf}</span>
            </div>
            <button
              onClick={carregar}
              className={cx(
                "rounded-xl px-4 py-2 text-sm font-semibold",
                "border border-slate-700 bg-slate-900 hover:bg-slate-800",
                loading && "opacity-60"
              )}
              disabled={loading}
            >
              {loading ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-12 gap-4">
          {/* Sidebar */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-bold">Painel</div>
                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                  {mode === "admin" ? "ADMIN" : "PRO"}
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-3 grid grid-cols-2 gap-2">
                {[
                  ["agenda", "📅 Agenda"],
                  ["filtros", "🔎 Filtros"],
                  ["status", "🎨 Status"],
                  ["links", "⚙️ Ações"],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k as any)}
                    className={cx(
                      "rounded-xl px-3 py-2 text-left text-sm font-semibold",
                      "border border-slate-800",
                      tab === k ? "bg-slate-800" : "bg-slate-950 hover:bg-slate-800/60"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Conteúdo por tab */}
              {tab === "agenda" && (
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-400">Eventos</div>
                    <div className="text-lg font-bold text-slate-100">{events.length}</div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-400">Dica</div>
                    <div className="text-sm text-slate-200">
                      Clique/arraste no calendário para criar (se você ligar criação depois).
                    </div>
                  </div>
                </div>
              )}

              {tab === "filtros" && (
                <div className="space-y-3">
                  {/* Range */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-2 text-xs font-semibold text-slate-300">Período</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="mb-1 text-xs text-slate-400">Início</div>
                        <input
                          type="date"
                          value={datai}
                          onChange={(e) => setDatai(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <div className="mb-1 text-xs text-slate-400">Fim</div>
                        <input
                          type="date"
                          value={dataf}
                          onChange={(e) => setDataf(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={carregar}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                    >
                      Aplicar período
                    </button>
                  </div>

                  {/* Prof */}
                  {mode === "admin" && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="mb-2 text-xs font-semibold text-slate-300">Profissional</div>
                      <select
                        value={prof}
                        onChange={(e) => setProf(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                      >
                        {professionals.map((p) => (
                          <option key={p} value={p}>{p === "ALL" ? "Todos" : p}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Status */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-2 text-xs font-semibold text-slate-300">Status</div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s === "ALL" ? "Todos" : s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Busca */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-2 text-xs font-semibold text-slate-300">Buscar</div>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Paciente / procedimento / status..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {tab === "status" && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">Cores (ajuste em statusColor())</div>
                  {statuses.filter(s=>s!=="ALL").slice(0,10).map((s) => (
                    <div key={s} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-sm text-slate-200">{s}</div>
                      <div className="h-4 w-10 rounded-md" style={{ background: statusColor(s) }} />
                    </div>
                  ))}
                  {statuses.length > 11 && (
                    <div className="text-xs text-slate-500">+ mais status encontrados: {statuses.length - 11}</div>
                  )}
                </div>
              )}

              {tab === "links" && (
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-400 mb-1">Ações</div>
                    <button
                      onClick={() => { setProf("ALL"); setStatus("ALL"); setSearch(""); }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                    >
                      Limpar filtros
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <div className="text-xs text-slate-400 mb-1">Debug</div>
                    <button
                      onClick={() => console.log("RAW KONSIST:", raw)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                    >
                      Console: RAW
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main calendar */}
          <section className="col-span-12 lg:col-span-9">
            {error && (
              <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                ❌ {error}
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div className="h-[72vh] w-full">
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  height="100%"
                  expandRows
                  nowIndicator
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                  }}
                  events={events as any}
                  eventClick={(info) => {
                    const ex: any = info.event.extendedProps || {};
                    alert(
                      `Paciente: ${ex.paciente || "-"}\n` +
                      `Procedimento: ${ex.procedimento || "-"}\n` +
                      `Profissional: ${ex.profissional || "-"}\n` +
                      `Status: ${ex.status || "-"}`
                    );
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}