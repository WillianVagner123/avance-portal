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

function normalizeStr(v: any) {
  return String(v ?? "").trim();
}

function statusColor(status: string) {
  const s = (status || "").toLowerCase();

  // ✅ ajuste fácil aqui conforme o seu "status_personalizado"
  if (s.includes("cancel")) return "#ef4444";      // red
  if (s.includes("falta")) return "#f97316";       // orange
  if (s.includes("confirm")) return "#22c55e";     // green
  if (s.includes("agend")) return "#3b82f6";       // blue
  if (s.includes("atend")) return "#a855f7";       // purple

  // fallback
  return "#64748b"; // slate
}

function parseStartFromKonsist(dateStr: string, hourStr: string) {
  // agendamento_data: "2026-01-18"
  // agendamento_hora: "08:30" ou "08:30:00"
  const d = normalizeStr(dateStr);
  const h = normalizeStr(hourStr);

  if (!d) return null;

  let hh = 0, mm = 0;

  if (/^\d{2}:\d{2}/.test(h)) {
    const parts = h.split(":");
    hh = Number(parts[0] || 0);
    mm = Number(parts[1] || 0);
  } else if (/^\d{3,4}$/.test(h)) {
    const s = h.padStart(4, "0");
    hh = Number(s.slice(0, 2));
    mm = Number(s.slice(2, 4));
  }

  const [Y, M, D] = d.split("-").map((x) => Number(x));
  if (!Y || !M || !D) return null;

  return new Date(Y, M - 1, D, hh, mm, 0);
}

export default function CalendarClient({ mode, title, subtitle }: Props) {
  const [tab, setTab] = useState<"agenda" | "filtros" | "status" | "acoes">("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [raw, setRaw] = useState<KonsistItem[]>([]);
  const [medico, setMedico] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [datai, setDatai] = useState<string>("");
  const [dataf, setDataf] = useState<string>("");

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const DEFAULT_EVENT_MINUTES = 30;

  async function carregar() {
    if (!datai || !dataf) return;

    setError("");
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        datai,
        dataf,
        medico: medico === "ALL" ? "" : medico,
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

  // init datas no client (evita hydration mismatch)
  useEffect(() => {
    const di = toISODate(new Date());
    const df = toISODate(addDays(new Date(), 4));
    setDatai(di);
    setDataf(df);
  }, []);

  // carrega quando datas existirem
  useEffect(() => {
    if (!datai || !dataf) return;
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datai, dataf]);

  // ===== Flatten agendamentos (Resultado -> agendamento[])
  const flat = useMemo(() => {
    const out: any[] = [];
    raw.forEach((pac: any) => {
      const paciente = normalizeStr(pac?.paciente) || "Paciente";
      const idpaciente = pac?.idpaciente;
      const tel = normalizeStr(pac?.telefone);

      const ags = Array.isArray(pac?.agendamento) ? pac.agendamento : [];
      ags.forEach((ag: any) => {
        const st = normalizeStr(ag?.agendamento_status_personalizado || ag?.agendamento_status);
        const med = normalizeStr(ag?.agendamento_medico);
        const esp = normalizeStr(ag?.agendamento_especialidade);
        const proc = normalizeStr(ag?.agendamento_procedimento);
        const cod = normalizeStr(ag?.agendamento_codigo_procedimento);

        const startDate = parseStartFromKonsist(ag?.agendamento_data, ag?.agendamento_hora);
        if (!startDate) return;
        const endDate = new Date(startDate.getTime() + DEFAULT_EVENT_MINUTES * 60 * 1000);

        out.push({
          paciente,
          idpaciente,
          telefonePaciente: tel,

          agendamento_chave: ag?.agendamento_chave,
          medico: med,
          especialidade: esp,
          procedimento: proc,
          codigoProcedimento: cod,
          status: st,

          startDate,
          endDate,

          unidade: normalizeStr(ag?.empresa_unidade),
          endereco: normalizeStr(ag?.empresa_endereco),
          telefoneUnidade: normalizeStr(ag?.empresa_telefone),
          preparo: normalizeStr(ag?.agendamento_preparo),

          marcacao: Array.isArray(ag?.agendamento_marcacao) ? ag.agendamento_marcacao : [],
          rawPaciente: pac,
          rawAgendamento: ag,
        });
      });
    });
    return out;
  }, [raw]);

  // listas de filtros reais (vem de dentro do agendamento)
  const medicos = useMemo(() => {
    const set = new Set<string>();
    flat.forEach((x) => { if (x?.medico) set.add(x.medico); });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flat]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    flat.forEach((x) => { if (x?.status) set.add(x.status); });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flat]);

  // filtros
  const filtered = useMemo(() => {
    const q = normalizeStr(search).toLowerCase();
    return flat.filter((x) => {
      if (medico !== "ALL" && x.medico !== medico) return false;
      if (status !== "ALL" && x.status !== status) return false;

      if (q) {
        const hay = `${x.paciente} ${x.procedimento} ${x.codigoProcedimento} ${x.medico} ${x.especialidade} ${x.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [flat, medico, status, search]);

  // eventos pro FullCalendar
  const events = useMemo(() => {
    return filtered.map((x, idx) => {
      const id = x?.agendamento_chave ?? `${x.idpaciente || "p"}-${idx}`;
      const color = statusColor(x.status);

      const titleBase =
        `${x.paciente}` +
        (x.procedimento ? ` — ${x.procedimento}` : "") +
        (x.codigoProcedimento ? ` (${x.codigoProcedimento})` : "");

      const title =
        mode === "admin"
          ? titleBase + (x.medico ? ` • ${x.medico}` : "") + (x.especialidade ? ` • ${x.especialidade}` : "")
          : titleBase;

      return {
        id: String(id),
        title,
        start: x.startDate,
        end: x.endDate,
        backgroundColor: color,
        borderColor: color,
        textColor: "#0b1020",
        extendedProps: x,
      };
    });
  }, [filtered, mode]);

  return (
    <>
      <style jsx global>{`
        /* ===== Page feel ===== */
        /* ===== FullCalendar Modern Skin ===== */
        .fc {
          --fc-border-color: rgba(15, 23, 42, 0.10);
          --fc-page-bg-color: transparent;
          --fc-today-bg-color: rgba(244, 63, 94, 0.12);
          --fc-neutral-bg-color: rgba(15, 23, 42, 0.5);
          --fc-list-event-hover-bg-color: rgba(255,255,255,.06);
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        }
        .fc .fc-scrollgrid,
        .fc .fc-scrollgrid-section > td,
        .fc .fc-scrollgrid-section > th {
          border-color: rgba(148, 163, 184, 0.16);
        }
        .fc .fc-toolbar-title {
          font-size: 18px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: rgba(15, 23, 42, 0.92);
        }
        .fc .fc-button {
          background: rgba(255, 255, 255, 0.85) !important;
          border: 1px solid rgba(15, 23, 42, 0.10) !important;
          color: rgba(226, 232, 240, 0.95) !important;
          border-radius: 12px !important;
          padding: 8px 12px !important;
          font-weight: 800 !important;
          box-shadow: none !important;
          text-transform: none !important;
        }
        .fc .fc-button:hover {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        .fc .fc-button:disabled { opacity: .45 !important; }
        .fc .fc-daygrid-day-number,
        .fc .fc-col-header-cell-cushion {
          color: rgba(148, 163, 184, 0.98);
          text-decoration: none;
          font-weight: 800;
        }
        .fc .fc-timegrid-slot-label,
        .fc .fc-timegrid-axis-cushion {
          color: rgba(148, 163, 184, 0.92);
          font-weight: 800;
        }
        .fc .fc-event {
          color: rgba(15,23,42,.95) !important;
          border-radius: 14px;
          padding: 2px 6px;
          border-width: 1px;
          box-shadow: 0 10px 26px rgba(0,0,0,.25);
        }
        .fc .fc-event .fc-event-title { font-weight: 900; }
        .fc .fc-timegrid-now-indicator-line { border-color: rgba(34,197,94,.9); }
      `}</style>

      <div className="min-h-[calc(100vh-1px)] w-full bg-transparent text-slate-900">
        <div className="mx-auto max-w-[1400px] px-4 py-5">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                {title || (mode === "admin" ? "Konsist Calendar" : "Meu Calendário")}
              </h1>
              <p className="text-sm text-slate-600">
                {subtitle || "Agenda premium: filtros por médico, status e busca por paciente/procedimento."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs text-slate-700">
                <span className="opacity-70">Range:</span>{" "}
                <span className="font-extrabold">{datai || "—"}</span>{" "}
                <span className="opacity-60">→</span>{" "}
                <span className="font-extrabold">{dataf || "—"}</span>
              </div>

              <button
                onClick={carregar}
                className={cx(
                  "rounded-full px-5 py-2 text-sm font-extrabold",
                  "border border-slate-700 bg-white/70 hover:bg-white/80",
                  loading && "opacity-60"
                )}
                disabled={loading}
              >
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>

          {/* Layout */}
          <div className="grid grid-cols-12 gap-4">
            {/* Sidebar */}
            <aside className="col-span-12 lg:col-span-3">
              <div className="rounded-3xl border border-white/40 bg-white/60 p-3 shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-black">Painel</div>
                  <div className="rounded-full border border-slate-700 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700">
                    {mode === "admin" ? "ADMIN" : "PRO"}
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[
                    ["agenda", "📅 Agenda"],
                    ["filtros", "🔎 Filtros"],
                    ["status", "🎨 Status"],
                    ["acoes", "⚙️ Ações"],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTab(k as any)}
                      className={cx(
                        "rounded-2xl px-3 py-2 text-left text-sm font-extrabold",
                        "border border-white/40",
                        tab === k ? "bg-white/80" : "bg-white/70 hover:bg-white/80/60"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === "agenda" && (
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                      <div className="text-xs text-slate-600">Eventos</div>
                      <div className="text-2xl font-black text-slate-900">{events.length}</div>
                    </div>

                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                      <div className="text-xs text-slate-600 mb-1">Dica</div>
                      <div className="text-sm text-slate-800">
                        Clique em um evento para abrir o detalhe premium.
                      </div>
                    </div>
                  </div>
                )}

                {tab === "filtros" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                      <div className="mb-2 text-xs font-extrabold text-slate-700">Período</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-xs text-slate-600">Início</div>
                          <input
                            type="date"
                            value={datai}
                            onChange={(e) => setDatai(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-white/70 px-2 py-2 text-sm font-bold"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-xs text-slate-600">Fim</div>
                          <input
                            type="date"
                            value={dataf}
                            onChange={(e) => setDataf(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-white/70 px-2 py-2 text-sm font-bold"
                          />
                        </div>
                      </div>
                      <button
                        onClick={carregar}
                        className="mt-2 w-full rounded-xl border border-slate-700 bg-white/70 px-3 py-2 text-sm font-extrabold hover:bg-white/80"
                      >
                        Aplicar período
                      </button>
                    </div>

                    {mode === "admin" && (
                      <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                        <div className="mb-2 text-xs font-extrabold text-slate-700">Médico</div>
                        <select
                          value={medico}
                          onChange={(e) => setMedico(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-white/70 px-2 py-2 text-sm font-bold"
                        >
                          {medicos.map((m) => (
                            <option key={m} value={m}>{m === "ALL" ? "Todos" : m}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                      <div className="mb-2 text-xs font-extrabold text-slate-700">Status</div>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-white/70 px-2 py-2 text-sm font-bold"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s === "ALL" ? "Todos" : s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-white/40 bg-white/70 p-3">
                      <div className="mb-2 text-xs font-extrabold text-slate-700">Busca</div>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Paciente / procedimento / médico..."
                        className="w-full rounded-xl border border-slate-700 bg-white/70 px-3 py-2 text-sm font-bold"
                      />
                    </div>
                  </div>
                )}

                {tab === "status" && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-600">Cores por status (editável em statusColor)</div>
                    {statuses.filter(s => s !== "ALL").slice(0, 12).map((s) => (
                      <div
                        key={s}
                        className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/70 p-3"
                      >
                        <div className="text-sm font-extrabold text-slate-800">{s}</div>
                        <div className="h-4 w-10 rounded-lg" style={{ background: statusColor(s) }} />
                      </div>
                    ))}
                    {statuses.length > 13 && (
                      <div className="text-xs text-slate-500">
                        + {statuses.length - 13} outros status
                      </div>
                    )}
                  </div>
                )}

                {tab === "acoes" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => { setMedico("ALL"); setStatus("ALL"); setSearch(""); }}
                      className="w-full rounded-2xl border border-slate-700 bg-white/70 px-3 py-3 text-sm font-extrabold hover:bg-white/80"
                    >
                      Limpar filtros
                    </button>

                    <button
                      onClick={() => console.log("RAW:", raw)}
                      className="w-full rounded-2xl border border-slate-700 bg-white/70 px-3 py-3 text-sm font-extrabold hover:bg-white/80"
                    >
                      Debug (console): RAW
                    </button>
                  </div>
                )}
              </div>
            </aside>

            {/* Main */}
            <section className="col-span-12 lg:col-span-9">
              {error && (
                <div className="mb-3 rounded-3xl border border-red-300 bg-red-100 px-4 py-3 text-sm font-bold text-red-700">
                  ❌ {error}
                </div>
              )}

              <div className="rounded-3xl border border-white/40 bg-white/60 p-3 shadow-[0_20px_60px_rgba(0,0,0,.35)] backdrop-blur">
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
                      setSelected(ex);
                      setOpen(true);
                    }}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Modal */}
          {open && (
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-[720px] rounded-3xl border border-slate-700 bg-white/70 p-4 shadow-[0_30px_120px_rgba(0,0,0,.55)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold text-slate-600">DETALHE DO AGENDAMENTO</div>
                    <div className="text-xl font-black">{selected?.paciente || "Paciente"}</div>
                    <div className="text-sm text-slate-700">
                      {selected?.procedimento || "—"}{" "}
                      {selected?.codigoProcedimento ? `(${selected.codigoProcedimento})` : ""}
                    </div>
                  </div>

                  <button
                    className="rounded-full border border-slate-700 bg-white/70 px-4 py-2 text-sm font-extrabold hover:bg-white/80"
                    onClick={() => setOpen(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600">Status</div>
                    <div className="mt-1 inline-flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: statusColor(String(selected?.status || "")) }}
                      />
                      <span className="text-sm font-extrabold text-slate-900">{selected?.status || "—"}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600">Médico / Especialidade</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {selected?.medico || "—"}
                    </div>
                    <div className="text-xs text-slate-600">{selected?.especialidade || ""}</div>
                  </div>

                  <div className="rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600">Unidade</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {selected?.unidade || "—"}
                    </div>
                    <div className="text-xs text-slate-600">{selected?.endereco || ""}</div>
                  </div>

                  <div className="rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600">Contato</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {selected?.telefonePaciente || "—"}
                    </div>
                    <div className="text-xs text-slate-600">
                      Unidade: {selected?.telefoneUnidade || "—"}
                    </div>
                  </div>

                  <div className="md:col-span-2 rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600">Preparo</div>
                    <div className="mt-1 text-sm font-bold text-slate-900 whitespace-pre-wrap">
                      {selected?.preparo || "—"}
                    </div>
                  </div>
                </div>

                {!!selected?.marcacao?.length && (
                  <div className="mt-3 rounded-2xl border border-white/40 bg-white/70/60 p-3">
                    <div className="text-xs text-slate-600 mb-2">Marcação</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.marcacao.map((m: any, i: number) => (
                        <span
                          key={i}
                          className="rounded-full border border-slate-700 bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-800"
                        >
                          {m?.descricao || m?.codigo || "—"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}