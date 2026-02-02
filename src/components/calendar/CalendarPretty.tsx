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

function toISODate(d: Date | null | undefined) {
  if (!d || isNaN(d.getTime())) return "";
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

function startOfMonth(d: Date | null | undefined) {
  const base = d && !isNaN(d.getTime()) ? d : new Date();
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

function isSameDay(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addMonths(d: Date | null | undefined, n: number) {
  const base = d && !isNaN(d.getTime()) ? d : new Date();
  return new Date(base.getFullYear(), base.getMonth() + n, 1);
}

function clampToDay(d: Date | null | undefined) {
  const base = d && !isNaN(d.getTime()) ? d : new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0);
}

// ==========================
// 🔧 EXTRAÇÃO SEGURA DE DATA/HORA
// ==========================
function extractTime(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    if (value.hora) return String(value.hora).trim();
    if (value.time) return String(value.time).trim();
    if (value.value) return String(value.value).trim();
  }
  return "";
}

function pickDateTime(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v) return v;
  }
  return null;
}

function brToISO(dt: any) {
  if (typeof dt !== "string") return dt;
  const s = dt.trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return s.replace(" ", "T");

  const m = s.match(
    /^([0-3]\d)\/([0-1]\d)\/(\d{4})(?:\s+([0-2]\d):([0-5]\d)(?::([0-5]\d))?)?$/
  );
  if (!m) return dt;

  const [, dd, mm, yyyy, HH, MM, SS] = m;
  const hh = HH ?? "00";
  const mi = MM ?? "00";
  const ss = SS ?? "00";
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

// ==========================
// ✅ Status normalizado
// ==========================
function normalizeStatus(s: any) {
  const t = String(s || "").trim().toLowerCase();
  if (["confirmado", "c"].includes(t)) return "Confirmado";
  if (["agendado", "agendada", " "].includes(t)) return "Não Confirmado";
  if (["desmarcado", "desmarcada", "d", "cancelado", "cancelada"].includes(t)) return "Desmarcado";
  if (["atendido", "realizado", "m"].includes(t)) return "Atendido pelo Medico";
  if (["b", "bloqueado", "bloqueada"].includes(t)) return "Bloqueado";
  return "Não Confirmado";
}

function statusColorNormalized(norm: string) {
  switch (norm) {
    case "Confirmado":
      return "#22c55e";
    case "Desmarcado":
      return "#ef4444";
    case "Atendido pelo Medico":
      return "#a855f7";
    case "Bloqueado":
      return "#94a3b8";
    case "Não Confirmado":
    default:
      return "#3b82f6";
  }
}

function normalizeKonsist(items: any[]): any[] {
  const out: any[] = [];
  for (const row of items || []) {
    const paciente =
      row?.paciente ||
      row?.nomepaciente ||
      row?.Paciente ||
      row?.descricao ||
      "";
    const ags = Array.isArray(row?.agendamento) ? row.agendamento : [];
    if (ags.length) {
      for (const ag of ags) {
        out.push({ ...ag, paciente, __konsist_parent: row });
      }
      continue;
    }
    out.push(row);
  }
  return out;
}

function fmtHeaderDay(d: Date | null | undefined) {
  if (!d || isNaN(d.getTime())) return { left: "", right: "" };
  const isToday = toISODate(d) === toISODate(new Date());
  const month = d.toLocaleString("pt-BR", { month: "long" });
  const day = d.getDate();
  const label = `${month.charAt(0).toUpperCase()}${month.slice(1)} ${day}`;
  return { left: isToday ? "HOJE" : "DIA", right: label };
}

// ==========================
// MiniCalendar
// ==========================
function MiniCalendar({
  value,
  onChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
}) {
  const [view, setView] = useState<Date>(() => startOfMonth(value));
  useEffect(() => setView(startOfMonth(value)), [value]);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
    const txt = fmt.format(view);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }, [view]);

  const days = useMemo(() => {
    const first = startOfMonth(view);
    const startDow = first.getDay();
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
          className="h-9 w-9 rounded-2xl bg-slate-950/60 border border-white/10 text-slate-100 font-black hover:bg-slate-900/70"
          aria-label="Mes anterior"
        >
          ‹
        </button>

        <div className="text-[12px] font-black text-slate-100/90">{monthLabel}</div>

        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, 1))}
          className="h-9 w-9 rounded-2xl bg-slate-950/60 border border-white/10 text-slate-100 font-black hover:bg-slate-900/70"
          aria-label="Proximo mes"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {week.map((w, i) => (
          <div key={`${w}-${i}`} className="text-center text-[10px] font-black text-slate-200/70">
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
                "h-9 rounded-2xl border text-[11px] font-black transition",
                inMonth
                  ? "bg-slate-950/45 border-white/10 text-slate-100 hover:bg-slate-900/60"
                  : "bg-transparent border-white/5 text-slate-400/60 hover:bg-white/5",
                selected ? "ring-2 ring-blue-500/70 bg-blue-500/20 border-blue-400/40" : "",
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
        className="mt-2 w-full rounded-2xl bg-slate-950/60 border border-white/10 px-3 py-2 text-[12px] font-black text-slate-100 hover:bg-slate-900/70"
      >
        Hoje
      </button>
    </div>
  );
}

// ==========================
// Hover Tooltip
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
      className="fixed z-[9999] w-[320px] rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_30px_120px_rgba(0,0,0,.65)] backdrop-blur"
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

function PatientDrawer({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: DrawerData | null;
  onClose: () => void;
}) {
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
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

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
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

          <div className="mt-4 text-xs text-slate-500">
            (Depois a gente pode colocar telefone, convênio, procedimento, etc.)
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// Render do evento: HORÁRIO | NOME (lado a lado)
// ==========================
function renderEventContent(arg: any) {
  const ex = arg.event.extendedProps || {};
  const paciente = ex.paciente || "-";

  const start = arg.event.start
    ? arg.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const end = arg.event.end
    ? arg.event.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="fcx-eventRow">
      <span className="fcx-timePill">{start}-{end}</span>
      <span className="fcx-patient">{paciente}</span>
      <span className="fcx-timePill fcx-ghostPill">{start}-{end}</span>
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
    <div className="mb-3 rounded-3xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-white">{label}</div>
          {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
        </div>
        <div className="text-xs font-extrabold text-slate-200">{Math.max(0, Math.min(100, percent))}%</div>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-950/60 border border-white/10">
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
  const [isClient, setIsClient] = useState(false);

  // ✅ Mobile detect (sem quebrar SSR)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(mq.matches);
    apply();

    if (typeof mq.addEventListener === "function") mq.addEventListener("change", apply);
    else (mq as any).addListener?.(apply);

    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", apply);
      else (mq as any).removeListener?.(apply);
    };
  }, [isClient]);

  const slotMinTime = isMobile ? "07:00:00" : "06:00:00";
  const slotMaxTime = isMobile ? "20:00:00" : "21:00:00";

  // ✅ PROFESSIONAL: load last saved filter and try to bind via session
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

  useEffect(() => {
    if (mode !== "professional") return;
    try {
      if (prof && prof !== "ALL") window.localStorage.setItem("AVANCE_PRO_SELECTED_PROF", prof);
    } catch {}
  }, [mode, prof]);

  const [datai, setDatai] = useState<string>("");
  const [dataf, setDataf] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  useEffect(() => setSelectedDate(new Date()), []);

  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null);

  const [chunks, setChunks] = useState<Record<string, KonsistItem[]>>({});
  const [prog, setProg] = useState({ running: false, done: 0, total: 0, current: "" });

  async function fetchRange(di: string, df: string, prof?: string, status?: string, search?: string) {
    const payload = {
      datai: di,
      dataf: df,
      idpaciente: 0,
      cpfPaciente: "",
      profissional: prof && prof !== "ALL" ? prof : undefined,
      status: status && status !== "ALL" ? status : undefined,
      search: search?.trim() || undefined,
    };

    const res = await fetch("/api/konsist/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let json: any;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(`Resposta inválida (HTTP ${res.status})`);
    }

    if (!res.ok) throw new Error(`Erro Konsist HTTP ${res.status}`);
    if (!Array.isArray(json)) throw new Error("Formato inesperado do Konsist (array esperado)");

    return normalizeKonsist(json);
  }

  function dedupeMerge(prev: any[], add: any[]) {
    const merged = [...prev, ...add];
    const seen = new Set<string>();
    const out: any[] = [];

    for (const x of merged) {
      const paciente = String(x?.paciente || "").trim().toLowerCase();
      const profNome = String(x?.agendamento_medico || x?.profissional || "").trim().toLowerCase();
      const inicio = String(x?.agendamento_inicio || "").trim();
      const sig = `${paciente}|${profNome}|${inicio}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      out.push(x);
    }
    return out;
  }

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
          } catch {
            // segue o baile
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
    return ["ALL", ...Array.from(set).sort((a, b) => (a as string).localeCompare(b as string))];
  }, [raw]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    raw.forEach((x) => {
      const s = x?.agendamento_status ?? x?.status ?? x?.situacao ?? x?.status_nome ?? x?.statusNome;
      const norm = normalizeStatus(s);
      if (norm) set.add(norm);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => (a as string).localeCompare(b as string))];
  }, [raw]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim();

    const norm = (v: any) =>
      String(v ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const profNorm = norm(prof);

    return raw.filter((x) => {
      const pRaw = String(
        x?.agendamento_medico ||
          x?.profissional ||
          x?.profissional_nome ||
          x?.profissionalNome ||
          x?.medico ||
          ""
      );
      const pNorm = norm(pRaw);

      const sRaw = x?.agendamento_status ?? x?.status ?? x?.situacao ?? x?.status_nome ?? x?.statusNome;
      const sNorm = normalizeStatus(sRaw) || "";

      const paciente = norm(x?.paciente || x?.nomepaciente || x?.Paciente || "");

      if (prof !== "ALL" && pNorm !== profNorm) return false;
      if (status !== "ALL" && sNorm !== status) return false;

      if (q) {
        const hay = `${paciente} ${pNorm} ${norm(sNorm)}`;
        if (!hay.includes(norm(q))) return false;
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

      const startRaw = String(x?.agendamento_inicio || "");
      const startISO = brToISO(startRaw);
      const startDate = new Date(startISO);

      if (isNaN(startDate.getTime())) continue;
      const start = startDate.toISOString();

      const dedupeKey = `${paciente.toLowerCase()}|${profNome.toLowerCase()}|${String(start)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      let endRaw = extractTime(
        pickDateTime(x, ["agendamento_fim", "agendamento_hora_fim", "agendamento_horaFim"])
      );

      let endISO = brToISO(endRaw);
      let endDate = endISO ? new Date(endISO) : null;

      if (!endDate || isNaN(endDate.getTime())) {
        endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 30);
      }

      const end = endDate.toISOString();
      const title = mode === "admin" ? `${paciente} • ${profNome}` : `${paciente}`;
      const color = statusColorNormalized(st);

      out.push({
        id: String(x?.id || x?.idagendamento || x?.agendamento_chave || idx),
        title,
        start,
        end,
        backgroundColor: color,
        borderColor: "rgba(255,255,255,.16)",
        textColor: "#041017",
        extendedProps: { paciente, profissional: profNome, status: st, raw: x },
      });
    }

    return out;
  }, [filtered, mode]);

  const summaryByStatus = useMemo(() => {
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
  const percent = useMemo(() => (!prog.total ? 0 : Math.round((prog.done / prog.total) * 100)), [prog]);

  
return (
 <>
  <style jsx global>{`
    :root { color-scheme: dark; }

    /* ✅ ajuste fino: “joga pra cima” o conteúdo do evento */
    :root{
      --fcx-nudge-y: -2px; /* tente -1px, -2px, -3px */
    }

    /* ===== Scroll bonito APENAS no painel/mini calendar ===== */
    .mini-scroll,
    .painel-scroll {
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.55) rgba(255, 255, 255, 0.06);
    }
    .mini-scroll::-webkit-scrollbar,
    .painel-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
    .mini-scroll::-webkit-scrollbar-track,
    .painel-scroll::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    }
    .mini-scroll::-webkit-scrollbar-thumb,
    .painel-scroll::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(148,163,184,.75), rgba(148,163,184,.35));
      border-radius: 999px;
      border: 2px solid rgba(2, 6, 23, 0.45);
    }
    .mini-scroll::-webkit-scrollbar-thumb:hover,
    .painel-scroll::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(148,163,184,.95), rgba(148,163,184,.5));
    }

    .painel-scroll{
      max-height: calc(100vh - 250px);
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 6px;
    }

    /* =====================
       FULLCALENDAR – LUXO/ENCORPADO (COM SCROLL INTERNO)
       ✅ SEM CORTAR O NOME (mesmo com slot baixo)
    ====================== */
    .fc {
      --fc-border-color: rgba(148, 163, 184, 0.12);
      --fc-page-bg-color: transparent;
      --fc-today-bg-color: rgba(59, 130, 246, 0.06);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      height: 100% !important;
    }

    /* ✅ ATIVA O SCROLL NO CALENDÁRIO GRANDE */
    .fc .fc-scroller,
    .fc .fc-scroller-liquid-absolute{
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }

    /* garante o harness ocupando o container (sem “cortes”) */
    .fc .fc-view-harness,
    .fc .fc-view-harness-active{
      height: 100% !important;
    }

    .fc .fc-timegrid-slot {
      border-top: 1px solid rgba(148, 163, 184, 0.12) !important;
    }
    .fc .fc-timegrid-col-frame {
      background: rgba(2, 6, 23, 0.08);
    }

    /* ✅ MUITO IMPORTANTE: evita “clipe” do evento dentro da coluna */
    .fc .fc-timegrid-col-frame,
    .fc .fc-timegrid-event-harness{
      overflow: visible !important;
    }

    /* botões mais gordinhos */
    .fc .fc-button {
      background: rgba(2, 6, 23, 0.55) !important;
      border: 1px solid rgba(148, 163, 184, 0.18) !important;
      color: rgba(226, 232, 240, 0.92) !important;
      border-radius: 999px !important;
      padding: 10px 14px !important;
      font-weight: 900 !important;
      box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28) !important;
    }
    .fc .fc-button:hover {
      background: rgba(15, 23, 42, 0.65) !important;
      border-color: rgba(148, 163, 184, 0.28) !important;
    }

    /* compact do eixo */
    .fc .fc-timegrid-axis-cushion,
    .fc .fc-timegrid-slot-label-cushion {
      color: rgba(226, 232, 240, 0.62);
      font-weight: 900;
      font-size: 11px;
    }

    /* ✅ slots bem compactos (pode manter 20px) */
    .fc .fc-timegrid-slot,
    .fc .fc-timegrid-slot-lane {
      height: 20px !important;
    }

    /* =========================
       EVENTO – NÃO CORTAR TEXTO
    ========================= */

    /* “pill” do evento: mantém bonito e com altura controlada */
    .fc .fc-timegrid-event {
      border-radius: 999px !important;
      padding: 0 10px !important;     /* ✅ remove padding vertical que estoura o slot */
      overflow: hidden !important;    /* mantém pill limpo */
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22) !important;
      backdrop-filter: blur(6px);
      min-height: 18px !important;    /* ✅ cabe dentro do slot 20px */
      line-height: 1 !important;
    }

    /* garante que o conteúdo use toda a altura disponível */
    .fc .fc-event-main-frame,
    .fc .fc-event-main {
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      min-height: 0 !important;
    }

    /* ✅ Conteúdo do evento: HORA | NOME CENTRALIZADO | ghost-pill */
    .fcx-eventRow{
      width: 100%;
      min-width: 0;
      height: 100%;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 8px;

      /* ✅ AQUI “JOGA PRA CIMA” (corrige corte quando slot é baixo) */
      transform: translateY(var(--fcx-nudge-y));
    }

    /* ✅ time pill mais baixo (senão ele sozinho estoura o slot) */
    .fcx-timePill{
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.2px;

      padding: 3px 8px;               /* ✅ menor */
      line-height: 1;                 /* ✅ evita cortar dentro do pill */
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: rgba(2, 6, 23, 0.92);
      white-space: nowrap;

      display: inline-flex;           /* ✅ garante centrado */
      align-items: center;
    }

    .fcx-ghostPill{
      visibility: hidden; /* ocupa espaço igual ao timePill -> centraliza o nome de verdade */
    }

    .fcx-patient{
      min-width: 0;
      font-size: 11px;
      font-weight: 900;
      color: rgba(2, 6, 23, 0.95);
      text-align: center;

      line-height: 1;                 /* ✅ mata corte vertical */
      padding: 0;                     /* ✅ sem padding vertical */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .fc .fc-button { padding: 8px 12px !important; font-size: 12px !important; }

      /* no mobile, dá um tiquinho de respiro */
      .fc .fc-timegrid-slot,
      .fc .fc-timegrid-slot-lane { height: 24px !important; }

      .fc .fc-timegrid-axis-cushion,
      .fc .fc-timegrid-slot-label-cushion { font-size: 10px !important; }

      .fc .fc-timegrid-event {
        padding: 0 10px !important;
        border-radius: 18px !important;
        min-height: 22px !important;
      }

      .fcx-timePill{ padding: 4px 8px; }
      .fcx-patient{ font-size: 11px; }
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

    <div className="w-full bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="mx-auto max-w-[1320px] px-2 sm:px-4 py-4">
        {/* HEADER */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-[220px]">
            <h1 className="text-base sm:text-lg font-black">
              {title || (mode === "admin" ? "Agenda Geral" : "Minha Agenda")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {subtitle || (mode === "admin" ? "Visão administrativa" : "Visão do profissional")}
            </p>
          </div>

          {/* TOP CONTROLS: Range + Profissional + Status + Atualizar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-200">
              <span className="text-slate-400">Range:</span>{" "}
              <span className="font-bold">{datai}</span> → <span className="font-bold">{dataf}</span>
            </div>

            {(mode === "admin" || mode === "professional") && (
              <select
                value={prof}
                onChange={(e) => setProf(e.target.value)}
                className="h-[36px] rounded-full border border-white/10 bg-slate-950/60 px-3 text-[12px] font-extrabold text-slate-100 hover:bg-slate-900/70 max-w-[260px]"
                title="Profissional"
              >
                {professionals.map((p) => (
                  <option key={p} value={p}>
                    {p === "ALL" ? "Todos" : p}
                  </option>
                ))}
              </select>
            )}

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-[36px] rounded-full border border-white/10 bg-slate-950/60 px-3 text-[12px] font-extrabold text-slate-100 hover:bg-slate-900/70 max-w-[220px]"
              title="Status"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "Todos" : s}
                </option>
              ))}
            </select>

            <button
              onClick={carregarPeriodoAtual}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-extrabold",
                "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_14px_34px_rgba(37,99,235,.22)]",
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
          <div className="mb-3 rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            ❌ {error}
          </div>
        )}

        {/* CARD PRINCIPAL (sem scrollbar interna; quem rola é a página) */}
        <div
          className={cx(
            "rounded-[30px] border border-white/10 bg-white/5 backdrop-blur",
            "p-3 sm:p-4 shadow-[0_26px_90px_rgba(0,0,0,.48)]",
            "min-h-[calc(100vh-210px)] overflow-visible"
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-3">
            {/* SIDEBAR (somente aqui tem scroll) */}
            <aside className="order-2 lg:order-1">
              <div className="rounded-[26px] bg-slate-950/25 border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black">Painel</div>
                  <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[11px] font-extrabold text-slate-200">
                    {mode === "admin" ? "ADMIN" : "PRO"}
                  </div>
                </div>

                <div className="mt-3 painel-scroll mini-scroll">
                  {/* MiniCalendar (sem overflow interno — deixa ele renderizar inteiro e o painel rola) */}
                  <div className="rounded-3xl bg-white/5 border border-white/10 p-3">
                    <div className="text-[11px] font-black text-slate-200/80">Ir para dia</div>

                    {isClient && selectedDate && (
                      <div className="mt-2">
                        <MiniCalendar
                          value={selectedDate}
                          onChange={(d) => {
                            setSelectedDate(d);
                            mainRef.current?.getApi().gotoDate(d);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Filtros (incorporados) */}
                  <div className="mt-3 space-y-3">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-2 text-xs font-extrabold text-slate-200">Período</div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-xs text-slate-400">Início</div>
                          <input
                            type="date"
                            value={datai}
                            onChange={(e) => setDatai(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                          />
                        </div>

                        <div>
                          <div className="mb-1 text-xs text-slate-400">Fim</div>
                          <input
                            type="date"
                            value={dataf}
                            onChange={(e) => setDataf(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                          />
                        </div>
                      </div>

                      <button
                        onClick={carregarPeriodoAtual}
                        className="mt-2 w-full rounded-2xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-extrabold text-white"
                      >
                        Aplicar período
                      </button>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
                      <div className="mb-2 text-xs font-extrabold text-slate-200">Buscar</div>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Paciente / profissional / status..."
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                      />
                    </div>

                    {mode === "professional" && defaultProfessional ? (
                      <button
                        type="button"
                        onClick={() => setProf(defaultProfessional)}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-slate-100 hover:bg-white/10"
                      >
                        Sou eu (padrão)
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>

            {/* CALENDÁRIO (sem scroll interno; cresce) */}
            <section className="order-1 lg:order-2">
              <div className="rounded-[26px] bg-slate-950/20 border border-white/10 p-3">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <div className="text-base font-black text-white">
                    {headerDay.left}{" "}
                    <span className="text-blue-300" suppressHydrationWarning>
                      {headerDay.right}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {mode === "admin" ? "Admin view" : "Professional view"}
                  </div>
                </div>

                <div className="w-full rounded-[22px] border border-white/10 bg-white/5 p-2 h-[calc(100vh-380px)]">
                  <FullCalendar
                    ref={mainRef as any}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridDay"
                    height="100%"
                    expandRows
                    nowIndicator
                    slotMinTime={slotMinTime}
                    slotMaxTime={slotMaxTime}
                    slotDuration="00:30:00"
                    slotEventOverlap={false}
                    eventOverlap={false}
                    allDaySlot={false}
                    headerToolbar={{ left: "prev,next today", center: "", right: "" }}
                    events={events as any}
                    eventContent={renderEventContent}
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

                <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-extrabold text-slate-200 mb-2">
                    Resumo do dia (por status)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summaryByStatus.length === 0 ? (
                      <div className="text-xs text-slate-600 opacity-70">Sem eventos no filtro atual.</div>
                    ) : (
                      summaryByStatus.map(([st, count]) => (
                        <div
                          key={st}
                          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: statusColorNormalized(st) }}
                          />
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

        <div className="mt-5 text-center text-xs text-slate-500">Desenvolvido by Will</div>
      </div>
    </div>
  </>
);
}