"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
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


function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function clampToDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
}

function MiniCalendar({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [view, setView] = React.useState<Date>(() => startOfMonth(value));

  React.useEffect(() => {
    setView(startOfMonth(value));
  }, [value]);

  const monthLabel = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    // capitaliza primeira letra
    const txt = fmt.format(view);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }, [view]);

  const days = React.useMemo(() => {
    const first = startOfMonth(view);
    const startDow = first.getDay(); // 0 domingo
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startDow);

    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      out.push(clampToDay(d));
    }
    return out;
  }, [view]);

  const week = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, -1))}
          className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/10 text-slate-100 font-black hover:bg-slate-900/70"
          aria-label="Mes anterior"
        >
          ‹
        </button>

        <div className="text-[12px] font-black text-slate-100/90">
          {monthLabel}
        </div>

        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, 1))}
          className="h-8 w-8 rounded-lg bg-slate-950/60 border border-white/10 text-slate-100 font-black hover:bg-slate-900/70"
          aria-label="Proximo mes"
        >
          ›
        </button>
      </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {week.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className="text-center text-[10px] font-black text-slate-200/70"
          >
            {w}
          </div>
        ))}

      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = d.getMonth() === view.getMonth();
          const selected = isSameDay(d, value);

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onChange(d)}
              className={[
                "h-8 rounded-lg border text-[11px] font-black transition",
                inMonth
                  ? "bg-slate-950/45 border-white/10 text-slate-100 hover:bg-slate-900/60"
                  : "bg-transparent border-white/5 text-slate-400/60 hover:bg-white/5",
                selected
                  ? "ring-2 ring-blue-500/70 bg-blue-500/20 border-blue-400/40"
                  : "",
              ].join(" ")}
              aria-label={"Dia " + d.getDate()}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange(clampToDay(new Date()))}
        className="mt-2 w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-[12px] font-black text-slate-100 hover:bg-slate-900/70"
      >
        Hoje
      </button>
    </div>
  );
}


// ✅ Local ISO (sem mudar horário por timezone do toISOString)
function toLocalISO(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// ✅ Status normalizado
function normalizeStatus(s: any) {
  const t = String(s || "").trim().toLowerCase();

  if (["confirmado", "c"].includes(t)) return "Confirmado";
  // remove "Agendado": vira Não Confirmado
  if (["agendado", "agendada", "a"].includes(t)) return "Não Confirmado";

  if (["desmarcado", "desmarcada", "d", "cancelado", "cancelada"].includes(t)) return "Desmarcado";
  if (["atendido", "realizado", "m"].includes(t)) return "Atendido pelo Medico";
  if (["b", "bloqueado", "bloqueada"].includes(t)) return "Bloqueado";

  return "Não Confirmado";
}

// ✅ Cor por status NORMALIZADO
function statusColorNormalized(norm: string) {
  switch (norm) {
    case "Confirmado":
      return "#22c55e";
    case "Desmarcado":
      return "#ef4444";
    case "Atendido pelo Medico":
      return "#a855f7";
    case "Bloqueado":
      return "#94a3b8"; // azul
    case "Não Confirmado":
    default:
      return "#3b82f6";
  }
}

function pickDateTime(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v) return v;
  }
  return null;
}

// ✅ se vier "19/01/2026 08:30" ou ISO parcial, converte
function brToISO(dt: any) {
  if (typeof dt !== "string") return dt;
  const s = dt.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.replace(" ", "T");

  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return dt;

  const [, dd, mm, yyyy, HH, MM, SS] = m;
  const hh = HH ?? "00";
  const mi = MM ?? "00";
  const ss = SS ?? "00";
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

// 🔥 Konsist retorna Resultado[] com agendamento[]
function normalizeKonsist(items: any[]): any[] {
  const out: any[] = [];
  for (const row of items || []) {
    const paciente = row?.paciente || row?.nomepaciente || row?.Paciente || "";
    const idpaciente = row?.idpaciente ?? row?.idPaciente ?? null;

    const ags =
      (Array.isArray(row?.agendamento) && row.agendamento) ||
      (Array.isArray(row?.Agendamento) && row.Agendamento) ||
      (Array.isArray(row?.agendamentos) && row.agendamentos) ||
      null;

    if (ags && ags.length) {
      for (const ag of ags) {
        out.push({
          ...ag,
          paciente,
          idpaciente,
          __konsist_parent: row,
        });
      }
      continue;
    }

    out.push(row);
  }
  return out;
}

function fmtHeaderDay(d: Date) {
  const isToday = toISODate(d) === toISODate(new Date());
  const month = d.toLocaleString("pt-BR", { month: "long" });
  const day = d.getDate();
  const label = `${month.charAt(0).toUpperCase()}${month.slice(1)} ${day}`;
  return { left: isToday ? "HOJE" : "DIA", right: label };
}

// ==========================
// HOVER Tooltip
// ==========================
type HoverInfo = {
  x: number;
  y: number;
  paciente: string;
  profissional: string;
  status: string;
  inicio?: string;
  fim?: string;
};

function HoverCard({ data }: { data: HoverInfo }) {
  return (
    <div
      className="fixed z-[9999] w-[320px] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_30px_120px_rgba(0,0,0,.65)] backdrop-blur"
      style={{ left: data.x + 12, top: data.y + 12 }}
    >
      <div className="text-[11px] text-slate-400 font-extrabold">PACIENTE</div>
      <div className="text-sm font-black text-white leading-tight">{data.paciente || "-"}</div>

      <div className="mt-2 text-[11px] text-slate-400 font-extrabold">PROFISSIONAL</div>
      <div className="text-xs font-extrabold text-slate-200">{data.profissional || "-"}</div>

      <div className="mt-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColorNormalized(data.status) }} />
        <div className="text-xs font-extrabold text-white">{data.status}</div>
      </div>

      {(data.inicio || data.fim) && (
        <div className="mt-2 text-[11px] text-slate-400">
          {data.inicio} {data.fim ? `→ ${data.fim}` : ""}
        </div>
      )}
    </div>
  );
}

// ==========================
// Drawer (Paciente)
// ==========================
type DrawerData = {
  paciente: string;
  profissional: string;
  status: string;
  inicio?: string;
  fim?: string;
  raw?: any;
};

function PatientDrawer({ open, data, onClose }: { open: boolean; data: DrawerData | null; onClose: () => void }) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-[420px] max-w-[90vw] bg-slate-950 border-l border-white/10 shadow-[0_30px_120px_rgba(0,0,0,.65)]">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-400 font-extrabold">PACIENTE</div>
              <div className="text-lg font-black text-white leading-snug">{data.paciente}</div>

              <div className="mt-3 text-[11px] text-slate-400 font-extrabold">PROFISSIONAL</div>
              <div className="text-sm font-extrabold text-slate-200">{data.profissional || "-"}</div>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-extrabold text-slate-200"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] text-slate-400 font-extrabold">STATUS</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColorNormalized(data.status) }} />
              <div className="text-sm font-black text-white">{data.status}</div>
            </div>

            <div className="mt-4 text-[11px] text-slate-400 font-extrabold">HORÁRIO</div>
            <div className="text-sm font-extrabold text-slate-200">
              {data.inicio || "-"} {data.fim ? `→ ${data.fim}` : ""}
            </div>
          </div>

          {/* espaço para você evoluir depois */}
          <div className="mt-4 text-xs text-slate-500">
            (Aqui depois a gente pode colocar telefone, convênio, procedimento, etc.)
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// Render do evento: horário + paciente
// ==========================
function renderEventContent(arg: any) {
  const ex = arg?.event?.extendedProps || {};
  const paciente = String(ex?.paciente || "Paciente").trim();

  const parts = paciente.split(/\s+/).filter(Boolean);
  const short = parts.length <= 2 ? paciente : `${parts[0]} ${parts[parts.length - 1]}`;

  const start = arg?.event?.start
    ? arg.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const end = arg?.event?.end
    ? arg.event.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="flex flex-col leading-tight">
      <div className="text-[11px] font-black opacity-80">
        {start}
        {end ? ` - ${end}` : ""}
      </div>
      <div className="text-[12px] font-black truncate">{short}</div>
    </div>
  );
}

// ==========================
// Progress UI
// ==========================
function ProgressBar({
  show,
  label,
  percent,
  sub,
}: {
  show: boolean;
  label: string;
  percent: number;
  sub?: string;
}) {
  if (!show) return null;
  return (
    <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
        </div>
        <div className="text-xs font-extrabold text-slate-200">{Math.max(0, Math.min(100, percent))}%</div>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-950/60 border border-white/10">
        <div className="h-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

export default function CalendarPretty({ mode, title, subtitle }: Props) {
const mainRef = useRef<FullCalendar | null>(null);
  
  const [tab, setTab] = useState<"agenda" | "filtros" | "status">("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [raw, setRaw] = useState<KonsistItem[]>([]);
  const [prof, setProf] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");


  const [defaultProfessional, setDefaultProfessional] = useState<string | undefined>(undefined);

  // ✅ PROFESSIONAL: carrega ultimo filtro salvo e tenta vincular pelo session
  useEffect(() => {
    if (mode !== "professional") return;

    try {
      const saved = window.localStorage.getItem("AVANCE_PRO_SELECTED_PROF");
      if (saved) setProf(saved);
    } catch {}

    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        const v = s?.user?.konsistMedicoNome;
        if (v) {
          setDefaultProfessional(v);
          setProf((p0) => (p0 && p0 !== "ALL" ? p0 : v));
        }
      })
      .catch(() => {});
  }, [mode]);

  // ✅ persistir escolha do profissional no modo professional
  useEffect(() => {
    if (mode !== "professional") return;
    try {
      if (prof && prof !== "ALL") window.localStorage.setItem("AVANCE_PRO_SELECTED_PROF", prof);
    } catch {}
  }, [mode, prof]);

  const [datai, setDatai] = useState<string>("");
  const [dataf, setDataf] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // ✅ drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null);

  // ✅ cache por janela
  const [chunks, setChunks] = useState<Record<string, KonsistItem[]>>({});

  // ✅ progresso
  const [prog, setProg] = useState({
    running: false,
    done: 0,
    total: 0,
    current: "",
  });

  async function fetchRange(di: string, df: string, p: string, st: string, q: string) {
    const qs = new URLSearchParams({
      datai: di,
      dataf: df,
      prof: p === "ALL" ? "" : p,
      status: st === "ALL" ? "" : st,
      q: q || "",
      mode,
    });

    const res = await fetch(`/api/konsist/agendamentos?${qs.toString()}`, { cache: "no-store" });
    const rawText = await res.text();

    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(`Resposta não-JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
    }

    if (!res.ok || !json?.ok) {
      const msg = json?.error ? `${json.error}${json.status ? ` (${json.status})` : ""}` : `HTTP ${res.status}`;
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

    return normalizeKonsist(items);
  }

  function dedupeMerge(prev: any[], add: any[]) {
    const merged = [...prev, ...add];
    const seen = new Set<string>();
    const out: any[] = [];

    for (const x of merged) {
      const paciente = String(x?.paciente || "").trim().toLowerCase();
      const profNome = String(x?.agendamento_medico || x?.profissional || "").trim().toLowerCase();
      const d = String(x?.agendamento_data || "").trim();
      const h = String(x?.agendamento_hora || "").trim();
      const sig = `${paciente}|${profNome}|${d}|${h}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(x);
    }
    return out;
  }

  // ==========================
  // Prefetch em chunks (4 dias)
  // ==========================
  async function prefetchRangeInChunks(startISO: string, endISO: string) {
    const start = new Date(startISO);
    const end = new Date(endISO);

    const msDay = 24 * 60 * 60 * 1000;
    const totalDias = Math.max(0, Math.round((end.getTime() - start.getTime()) / msDay));
    const step = 4;

    const totalChunks = Math.floor(totalDias / step) + 1;

    setProg({ running: true, done: 0, total: totalChunks, current: "" });
    setError("");
    setLoading(true);

    try {
      for (let i = 0; i <= totalDias; i += step) {
        const di = toISODate(addDays(start, i));
        const df = toISODate(addDays(start, Math.min(i + step - 1, totalDias)));

        const key = `${di}_${df}_${prof}_${status}_${(search || "").trim().toLowerCase()}`;
        setProg((p0) => ({ ...p0, current: `${di} → ${df}` }));

        if (!chunks[key]) {
          try {
            const flat = await fetchRange(di, df, prof, status, search);
            setChunks((prev) => ({ ...prev, [key]: flat }));
            setRaw((prev) => dedupeMerge(prev, flat));
          } catch (e) {
            console.warn("Falha no chunk", di, df);
          }
        }

        setProg((p0) => ({ ...p0, done: Math.min(p0.total, p0.done + 1) }));
      }
    } finally {
      setProg((p0) => ({ ...p0, running: false, current: "" }));
      setLoading(false);
    }
  }

  async function prefetch30DiasAuto() {
    const start = new Date();
    const diUI = toISODate(start);
    const dfUI = toISODate(addDays(start, 30));
    setDatai(diUI);
    setDataf(dfUI);

    setRaw([]);
    await prefetchRangeInChunks(diUI, dfUI);
  }

  async function carregarPeriodoAtual() {
    if (!datai || !dataf) return;
    setRaw([]);
    await prefetchRangeInChunks(datai, dataf);
  }

  useEffect(() => {
    prefetch30DiasAuto();
    setSelectedDate(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const professionals = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((x) => {
      const p =
        x?.agendamento_medico ||
        x?.profissional ||
        x?.profissional_nome ||
        x?.profissionalNome ||
        x?.medico ||
        x?.nutricionista ||
        x?.nome_medico ||
        x?.nomeProfissional;
      if (p) set.add(String(p));
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [raw]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((x) => {
      const s = x?.agendamento_status ?? x?.status ?? x?.situacao ?? x?.status_nome ?? x?.statusNome;
      const norm = normalizeStatus(s);
      if (norm) set.add(norm);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [raw]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim();

    return raw.filter((x) => {
      const pRaw = String(
        x?.agendamento_medico || x?.profissional || x?.profissional_nome || x?.profissionalNome || x?.medico || ""
      );

      const sRaw = x?.agendamento_status ?? x?.status ?? x?.situacao ?? x?.status_nome ?? x?.statusNome;
      const sNorm = normalizeStatus(sRaw) || "";

      const paciente = String(x?.paciente || x?.nomepaciente || x?.Paciente || "").toLowerCase();

      if (prof !== "ALL" && pRaw !== prof) return false;
      if (status !== "ALL" && sNorm !== status) return false;

      if (q) {
        const hay = `${paciente} ${pRaw.toLowerCase()} ${sNorm.toLowerCase()}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [raw, prof, status, search]);

  const events = useMemo(() => {
    const seen = new Set<string>();
    const out: any[] = [];

    for (let idx = 0; idx < filtered.length; idx++) {
      const x = filtered[idx];

      const paciente = String(x?.paciente || "Paciente").trim();
      const profNome =
        String(x?.agendamento_medico || x?.profissional || x?.profissional_nome || "").trim() || "-";

      const stRaw = x?.agendamento_status ?? x?.status ?? x?.situacao ?? "";
      const st = normalizeStatus(stRaw);

      const d = String(x?.agendamento_data || "").trim();
      const h = String(x?.agendamento_hora || "").trim();
      const start = brToISO(h ? `${d} ${h}` : d);

      if (!start || String(start).length < 10) continue;

      const dedupeKey = `${paciente.toLowerCase()}|${profNome.toLowerCase()}|${String(start)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      let end = pickDateTime(x, ["agendamento_fim", "agendamento_hora_fim", "agendamento_horaFim"]);
      end = brToISO(end);

      if (!end && start) {
        const dt = new Date(start);
        if (!isNaN(dt.getTime())) {
          dt.setMinutes(dt.getMinutes() + 30);
          end = toLocalISO(dt);
        }
      }

      const title = mode === "admin" ? `${paciente} • ${profNome}` : `${paciente}`;
      const color = statusColorNormalized(st);

      out.push({
        id: String(x?.id || x?.idagendamento || x?.agendamento_chave || idx),
        title,
        start,
        end,
        backgroundColor: color,
        borderColor: "rgba(255,255,255,.18)",
        textColor: "#07101f",
        extendedProps: {
          paciente,
          profissional: profNome,
          status: st,
          raw: x,
        },
      });
    }

    return out;
  }, [filtered, mode]);

  const summaryByStatus = useMemo(() => {
  // ✅ Conta APENAS os eventos do dia atualmente visível
  const dayKey = toISODate(selectedDate);
  const map = new Map<string, number>();

  for (const ev of events) {
    const start = ev?.start ? new Date(ev.start) : null;
    if (!start || isNaN(start.getTime())) continue;
    if (toISODate(start) !== dayKey) continue;

    const st = String(ev?.extendedProps?.status || "Não Confirmado");
    map.set(st, (map.get(st) || 0) + 1);
  }

  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}, [events, selectedDate]);

  const headerDay = useMemo(() => fmtHeaderDay(selectedDate), [selectedDate]);

  const percent = useMemo(() => {
    if (!prog.total) return 0;
    return Math.round((prog.done / prog.total) * 100);
  }, [prog]);

  return (
    <>
     <style jsx global>{`

  .fc {
    --fc-border-color: rgba(148, 163, 184, 0.12);
    --fc-page-bg-color: transparent;
    --fc-today-bg-color: rgba(59, 130, 246, 0.06);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  }
  .fc .fc-timegrid-slot {
    border-top: 1px solid rgba(148, 163, 184, 0.1) !important;
  }
  .fc .fc-timegrid-slot,
  .fc .fc-timegrid-slot-lane {
    height: 44px !important;
  }
  .fc .fc-timegrid-slot-label,
  .fc .fc-timegrid-slot-label-cushion,
  .fc .fc-timegrid-axis-frame {
    height: 44px !important;
    line-height: 44px !important;
  }
  .fc .fc-timegrid-axis-cushion,
  .fc .fc-timegrid-slot-label-cushion {
    color: rgba(226, 232, 240, 0.62);
    font-weight: 900;
    font-size: 12px;
  }
  .fc .fc-button {
    background: rgba(2, 6, 23, 0.55) !important;
    border: 1px solid rgba(148, 163, 184, 0.16) !important;
    color: rgba(226, 232, 240, 0.92) !important;
    border-radius: 999px !important;
    padding: 10px 14px !important;
    font-weight: 900 !important;
    box-shadow: none !important;
  }
  .fc .fc-event {
    border-radius: 18px !important;
    padding: 6px 10px !important;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25) !important;
    cursor: pointer;
  }

`}</style>

      {hover && <HoverCard data={hover} />}

      <PatientDrawer
        open={drawerOpen}
        data={drawerData}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerData(null);
        }}
      />

      <div className="min-h-[calc(100vh-1px)] w-full bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-[1600px] px-3 py-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">{title || (mode === "admin" ? "Agenda Geral" : "Minha Agenda")}</h1>
              <p className="text-sm text-slate-400">{subtitle || (mode === "admin" ? "Visão administrativa" : "Visão do profissional")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <span className="text-slate-400">Range:</span>{" "}
                <span className="font-bold">{datai}</span> → <span className="font-bold">{dataf}</span>
              </div>

              <button
                onClick={carregarPeriodoAtual}
                className={cx(
                  "rounded-full px-5 py-2.5 text-sm font-extrabold",
                  "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_16px_40px_rgba(37,99,235,.25)]",
                  loading && "opacity-70"
                )}
                disabled={loading}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
            </div>
          </div>

          <ProgressBar
            show={prog.running || loading}
            label={`Carregando agenda: ${prog.done}/${prog.total || 0} blocos (4 dias cada)`}
            percent={percent}
            sub={prog.current ? `Agora: ${prog.current}` : undefined}
          />

          {error && (
            <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              ❌ {error}
            </div>
          )}

          <div className="rounded-[34px] border border-white/10 bg-white/5 backdrop-blur p-4 shadow-[0_30px_120px_rgba(0,0,0,.55)]">
            <div className="grid grid-cols-12 gap-4">
              <aside className="col-span-12 lg:col-span-3">
                <div className="rounded-[28px] bg-slate-950/35 border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black">Painel</div>
                    <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-extrabold text-slate-200">
                      {mode === "admin" ? "ADMIN" : "PRO"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {[
                      ["agenda", "Calendar"],
                      ["filtros", "Filters"],
                      ["status", "Status"],
                    ].map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setTab(k as any)}
                        className={cx(
                          "w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-extrabold",
                          tab === k ? "bg-white/10" : "hover:bg-white/10"
                        )}
                      >
                        <span className={cx("h-10 w-10 rounded-2xl grid place-items-center", tab === k ? "bg-blue-600/30" : "bg-white/5")}>
                          ●
                        </span>
                        <div className="leading-tight">
                          <div className="text-sm">{label}</div>
                          <div className="text-xs text-slate-400">
                            {k === "agenda" ? "Visão do dia" : k === "filtros" ? "Profissional / status" : "Cores por status"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="text-xs text-slate-400">Itens (filtrados)</div>
                    <div className="text-2xl font-black text-white">{filtered.length}</div>
                    <div className="mt-1 text-xs text-slate-500">Eventos renderizados: {events.length}</div>
                  </div>
        
<div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
  <div className="text-[11px] font-black text-slate-200/80">Ir para dia</div>

  <MiniCalendar
  value={selectedDate}
  onChange={(d) => {
    setSelectedDate(d);
    mainRef.current?.getApi().gotoDate(d);
  }}
/>

</div>
{tab === "filtros" && (
                    <div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="mb-2 text-xs font-extrabold text-slate-200">Período</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="mb-1 text-xs text-slate-400">Início</div>
                            <input
                              type="date"
                              value={datai}
                              onChange={(e) => setDatai(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                            />
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-slate-400">Fim</div>
                            <input
                              type="date"
                              value={dataf}
                              onChange={(e) => setDataf(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                            />
                          </div>
                        </div>

                        <button
                          onClick={carregarPeriodoAtual}
                          className="mt-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-extrabold text-white"
                        >
                          Aplicar período
                        </button>
                      </div>

                      {(mode === "admin" || mode === "professional") && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="mb-2 text-xs font-extrabold text-slate-200">Profissional</div>
                          <select
                            value={prof}
                            onChange={(e) => setProf(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                          >
                            {professionals.map((p) => (
                              <option key={p} value={p}>
                                {p === "ALL" ? "Todos" : p}
                              </option>
                            ))}
                          </select>

                          {mode === "professional" && defaultProfessional ? (
                            <button
                              type="button"
                              onClick={() => setProf(defaultProfessional)}
                              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-slate-100 hover:bg-white/10"
                            >
                              Sou eu (padrão)
                            </button>
                          ) : null}

                        </div>
                      )}

                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="mb-2 text-xs font-extrabold text-slate-200">Status</div>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s === "ALL" ? "Todos" : s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="mb-2 text-xs font-extrabold text-slate-200">Buscar</div>
                        <input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Paciente / profissional / status..."
                          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  )}

                  {tab === "status" && (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                      <div className="text-xs font-extrabold text-slate-200 mb-2">Legenda</div>
                      {["Confirmado", "Não Confirmado", "Desmarcado", "Atendido pelo Medico", "Bloqueado"].map((s) => (
                        <div key={s} className="flex items-center gap-2 py-1 text-xs text-slate-300">
                          <span className="h-3 w-3 rounded-full" style={{ background: statusColorNormalized(s) }} />
                          <span className="font-extrabold">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              <section className="col-span-12 lg:col-span-9">
                <div className="rounded-[28px] bg-slate-950/35 border border-white/10 p-4">
                  <div className="mb-3 flex items-baseline justify-between">
                    <div className="text-sm font-extrabold text-slate-300">
                      {headerDay.left} <span className="text-blue-300">{headerDay.right}</span>
                    </div>
                    <div className="text-xs text-slate-400">{mode === "admin" ? "Admin view" : "Professional view"}</div>
                  </div>

                  <div className="h-[76vh] w-full">
                    <FullCalendar
                      ref={mainRef as any}
                      datesSet={(info) => {
                            setSelectedDate(info.view.currentStart);
                          }}

                      plugins={[timeGridPlugin, interactionPlugin]}
                      initialView="timeGridDay"
                      height="100%"
                      expandRows
                      nowIndicator
                      slotMinTime="06:00:00"
                      slotMaxTime="21:00:00"

                      // ✅ 30 min
                      slotDuration="00:30:00"

                      
                      slotEventOverlap={false}
                      eventOverlap={false}
allDaySlot={false}
                      eventMinHeight={38}
                      headerToolbar={{ left: "prev,next today", center: "", right: "" }}
                      events={events as any}
                      eventContent={renderEventContent}

                      // ✅ HOVER
                      eventMouseEnter={(info) => {
                        const ex: any = info.event.extendedProps || {};
                        const r = info.el.getBoundingClientRect();

                        const start = info.event.start
                          ? info.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "";
                        const end = info.event.end
                          ? info.event.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "";

                        setHover({
                          x: r.right,
                          y: r.top,
                          paciente: ex.paciente || "-",
                          profissional: ex.profissional || "-",
                          status: ex.status || "Não Confirmado",
                          inicio: start,
                          fim: end,
                        });
                      }}
                      eventMouseLeave={() => setHover(null)}

                      // ✅ CLICK: abre drawer (SEM nova aba)
                      eventClick={(info) => {
                        const ex: any = info.event.extendedProps || {};
                        const inicio = info.event.start
                          ? info.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "";
                        const fim = info.event.end
                          ? info.event.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                          : "";

                        setDrawerData({
                          paciente: ex.paciente || "-",
                          profissional: ex.profissional || "-",
                          status: ex.status || "Não Confirmado",
                          inicio,
                          fim,
                          raw: ex.raw,
                        });
                        setDrawerOpen(true);
                      }}
                    />
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                    <div className="text-xs font-extrabold text-slate-200 mb-2">Resumo do dia (por status)</div>
                    <div className="flex flex-wrap gap-2">
                      {summaryByStatus.length === 0 ? (
                        <div className="text-xs text-slate-500">Sem eventos no filtro atual.</div>
                      ) : (
                        summaryByStatus.map(([st, count]) => (
                          <div
                            key={st}
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColorNormalized(st) }} />
                            <span>{st}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5">{count}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
