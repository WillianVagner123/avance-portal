"use client";

const isPlainEmptyObject = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0;

const toStr = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  if (typeof v === "object") {
    for (const k of ["data", "hora", "value", "date", "time", "datetime", "text"]) {
      if (typeof v[k] === "string") return String(v[k]).trim();
    }
  }
  return "";
};

const buildStartISOFromItem = (x) => {
  const d1 = isPlainEmptyObject(x?.agendamento_data) ? "" : toStr(x?.agendamento_data);
  const h1 = isPlainEmptyObject(x?.agendamento_hora) ? "" : toStr(x?.agendamento_hora);

  const rawAg = Array.isArray(x?.raw?.agendamento) ? x.raw.agendamento : [];
  const first = rawAg[0] || null;
  const d2 = first ? toStr(first.agendamento_data) : "";
  const h2 = first ? toStr(first.agendamento_hora) : "";

  const data = d1 || d2;
  const hora = h1 || h2;

  if (!data) return { startISO: null };

  const dateISO = data.slice(0, 10);
  if (!hora) return { startISO: dateISO };

  const hhmm = /^\d{1,2}:\d{2}$/.test(hora) ? hora.padStart(5, "0") : hora;
  return { startISO: dateISO + "T" + hhmm + ":00" };
};

// Utility function for building class names. Accepts any number of arguments and
// filters out falsy values before joining them with a single space. This
// pattern avoids conditional string concatenation throughout the UI and
// improves readability when applying multiple conditional classes.
const cx = (...c: any[]) => c.filter(Boolean).join(" ");

// Format a JavaScript Date object into an ISO date string (YYYY-MM-DD). This
// helper is used throughout the calendar when computing day ranges and
// comparing dates without caring about time zones. Duplicates of this
// function in the previous version of the component have been removed.
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Convert a Date into a local ISO date‑time string (YYYY-MM-DDTHH:MM:SS)
// without adjusting for timezone offsets. This helper is used when
// computing the end of an appointment slot. Note that the native
// `toISOString()` would convert to UTC and adjust the time – which is not
// desirable in this context.
function toLocalISO(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(
    dt.getHours()
  )}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

// -----------------------------------------------------------------------------
// 🛠 Extractor Helpers
//
// The Konsist API sometimes returns date and time fields as objects rather than
// plain strings. For example `{ data: '01/02/2024' }` or `{ hora: '13:30' }`.
// Interpolating these objects directly into template strings produces
// "[object Object]" which then causes invalid date strings when building
// event start/end times. The functions below attempt to safely extract a
// string representation from these objects. If no string can be found, they
// return `fallback` (or `null` when not provided).
export function extractValue(value: any, fallback: string | null = null): string | null {
  if (!value) return fallback;
  // Already a string? return trimmed value
  if (typeof value === 'string') return value.trim();
  // Numbers can be converted to strings
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Keys to check in order of preference
    const preferredKeys = ['data', 'hora', 'value', 'date', 'time'];
    for (const key of preferredKeys) {
      if (key in value && typeof value[key] === 'string') {
        return value[key].trim();
      }
    }
    // Fallback: return the first string property
    for (const k in value) {
      const v = value[k];
      if (typeof v === 'string') {
        return v.trim();
      }
    }
  }
  return fallback;
}

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

// Helper for adding or subtracting days from a given date.
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// -----------------------------------------------------------------------------
// 📆 Helpers de mês (fetch)
//
// These helpers compute the first and last day of a month (in ISO format),
// simplify date comparisons and normalisation, and encapsulate minor logic for
// calendar operations.
// -----------------------------------------------------------------------------
function startOfMonthISO(d: Date) {
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function endOfMonthISO(d: Date) {
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function clampToDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
}

// ----------------------------------------------------------------------------
// Normalising status values returned by Konsist. Many different labels may map
// to the same logical state. The previous implementation repeated this logic
// across multiple functions; here it's centralised for clarity.
// ----------------------------------------------------------------------------
function normalizeStatus(s: any) {
  const t = String(s || "").trim().toLowerCase();
  if (["confirmado", "c"].includes(t)) return "Confirmado";
  // remove "Agendado": vira Não Confirmado
  if (["agendado", "agendada", ""].includes(t)) return "Não Confirmado";
  if (["desmarcado", "desmarcada", "d", "cancelado", "cancelada"].includes(t)) return "Desmarcado";
  if (["atendido", "realizado", "m"].includes(t)) return "Atendido pelo Medico";
  if (["b", "bloqueado", "bloqueada"].includes(t)) return "Bloqueado";
  return "Não Confirmado";
}

// Map normalised status strings to a consistent colour palette for the UI.
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

// Parse a Brazilian date/time string (DD/MM/YYYY HH:mm) into a local ISO string.
function brToISO(dt: string) {
  const m = dt.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})(?:\s+([0-9]{2}):([0-9]{2}))?/);
  if (!m) return dt;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

// --------------------------------------------------------------------------------------
// MiniCalendar component
// --------------------------------------------------------------------------------------
// A simple date picker used in the calendar sidebar. It displays a grid of 6x7
// cells representing days, highlights the current selection and supports
// navigation across months. When a user clicks on a day, the parent
// CalendarPretty component will update the visible day in the main view via
// gotoDate().

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
        <div className="text-[12px] font-black text-slate-100/90">{monthLabel}</div>
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
                "h-8 rounded-lg border text-[11px] font-black transition",
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
        className="mt-2 w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-[12px] font-black text-slate-100 hover:bg-slate-900/70"
      >
        Hoje
      </button>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HoverCard component
// ----------------------------------------------------------------------------
// Displays a tooltip with patient, professional, status and time information
// when the user hovers over an appointment on the calendar. This uses
// absolute positioning relative to the viewport and follows the cursor.
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

// ----------------------------------------------------------------------------
// PatientDrawer component
// ----------------------------------------------------------------------------
// Displays more detailed information about an appointment when the user clicks
// on it. The drawer slides in from the right and can be closed.
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
          {/* espaço para evoluções futuras */}
          <div className="mt-4 text-xs text-slate-500">
            (Aqui depois a gente pode colocar telefone, convênio, procedimento, etc.)
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// renderEventContent
// ----------------------------------------------------------------------------
// Custom renderer for calendar events. It displays the start time (and end
// time when available) in a small font and a truncated patient name below.
function renderEventContent(arg: any) {
  const ex = arg?.event?.extendedProps || {};
  const paciente = String(ex?.paciente || "Paciente").trim();
  const parts = paciente.split(/\s+/).filter(Boolean);
  const short = parts.length <= 2 ? paciente : `${parts[0]} ${parts[parts.length - 1]}`;
  const start = arg?.event?.start ? arg.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const end = arg?.event?.end ? arg.event.end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
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

// ----------------------------------------------------------------------------
// ProgressBar
// ----------------------------------------------------------------------------
// Displays the progress of prefetching operations. It takes a percentage value
// and optional subtext describing the current chunk being fetched.
function ProgressBar({ show, label, percent, sub }: { show: boolean; label: string; percent: number; sub?: string }) {
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

// ----------------------------------------------------------------------------
// CalendarPretty component
// ----------------------------------------------------------------------------
// The main calendar component. It handles data fetching, event normalisation,
// filtering and rendering. It also coordinates the drawer and hover tooltips.
//
// This component has been cleaned up: duplicate definitions have been removed,
// undefined variables have been eliminated, and the Google sync button hooks
// remain intact. The prefetchRangeInChunks helper has been restored to avoid
// syntax errors when compiling.
export default function CalendarPretty({ mode, title, subtitle }: Props) {
  const mainRef = useRef<FullCalendar | null>(null);
  const [tab, setTab] = useState<"agenda" | "filtros" | "status">("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [raw, setRaw] = useState<KonsistItem[]>([]);

  // Flatten the raw Konsist data into a list of individual appointments.  The Konsist API can
  // return an array of patient records, each containing an `agendamento` array of
  // appointments.  To simplify downstream processing we normalise this nested structure
  // into a flat array.  Each entry in the returned array contains the appointment fields
  // along with patient-level details (paciente, telefone, idpaciente).
  const flattenedRaw = useMemo(() => {
    const out: any[] = [];
    (Array.isArray(raw) ? raw : []).forEach((record: any) => {
      if (record && Array.isArray((record as any).agendamento)) {
        (record as any).agendamento.forEach((ag: any, idx: number) => {
          out.push({
            ...ag,
            paciente: (record as any)?.paciente ?? (record as any)?.nomepaciente ?? (record as any)?.Paciente ?? (record as any)?.paciente_nome ?? "",
            telefone: (record as any)?.telefone ?? (record as any)?.contato ?? "",
            idpaciente: (record as any)?.idpaciente ?? (record as any)?.pacienteId ?? (record as any)?.idpaciente ?? idx,
          });
        });
      } else {
        // If the item does not have an agendamento array, push it as-is.  This preserves
        // backwards compatibility with earlier API formats where each item represented a
        // single appointment.
        out.push(record);
      }
    });
    return out;
  }, [raw]);
  const [prof, setProf] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [defaultProfessional, setDefaultProfessional] = useState<string | undefined>(undefined);
  // sessão / google
  const [appUser, setAppUser] = useState<any>(null);
  const [proReq, setProReq] = useState<any>(null);
  // pedido de vínculo
  const [prosList, setProsList] = useState<string[]>([]);
  const [requestProf, setRequestProf] = useState<string>("");
  const [requesting, setRequesting] = useState(false);
  const [reqMsg, setReqMsg] = useState<string>("");
  // sync manual
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string>("");
  // progress state
  const [prog, setProg] = useState({ running: false, done: 0, total: 0, current: "" });
  const [datai, setDatai] = useState<string>("");
  const [dataf, setDataf] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<DrawerData | null>(null);
  const [chunks, setChunks] = useState<Record<string, KonsistItem[]>>({});

  // Load last selected professional and session info in professional mode.
  useEffect(() => {
    if (mode !== "professional") return;
    try {
      const saved = window.localStorage.getItem("AVANCE_PRO_SELECTED_PROF");
      if (saved) setProf(saved);
    } catch {
      // ignore
    }
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        setAppUser(s?.appUser || null);
        setProReq(s?.appUser?.professionalLinkRequest || null);
        const v = s?.appUser?.konsistMedicoNome || s?.user?.konsistMedicoNome;
        if (v) {
          setDefaultProfessional(v);
          setProf(v);
        }
      })
      .catch(() => {});
  }, [mode]);

  // Fetch list of professionals if no default is set.
  useEffect(() => {
    if (mode !== "professional") return;
    if (defaultProfessional) return;
    setReqMsg("");
    fetch("/api/me/professional-link-request", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok) setProReq(j.latest || null);
      })
      .catch(() => {});
    fetch("/api/konsist/professionals", { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list = Array.isArray(j?.professionals) ? j.professionals : [];
        setProsList(list);
        if (!requestProf && list.length) setRequestProf(list[0]);
      })
      .catch(() => {});
  }, [mode, defaultProfessional, requestProf]);

  // Persist selected professional in localStorage for professional mode.
  useEffect(() => {
    if (mode !== "professional") return;
    try {
      if (prof && prof !== "ALL") window.localStorage.setItem("AVANCE_PRO_SELECTED_PROF", prof);
    } catch {
      // ignore
    }
  }, [mode, prof]);

  async function requestProfessionalLink() {
    setRequesting(true);
    setReqMsg("");
    try {
      const r = await fetch("/api/me/professional-link-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedProfessional: requestProf }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Falha ao enviar solicitação");
      setProReq(j.latest || null);
      setReqMsg("✅ Solicitação enviada. Aguarde aprovação do admin.");
    } catch (e: any) {
      setReqMsg(`⚠️ ${e?.message || "Erro"}`);
    } finally {
      setRequesting(false);
    }
  }

  async function syncGoogleNow() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const r = await fetch("/api/google/sync-me", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Falha ao sincronizar");
      setSyncMsg(`✅ Sync OK. Itens: ${j.items} | Atualizados: ${j.upserted} | Removidos: ${j.deleted}`);
    } catch (e: any) {
      setSyncMsg(`⚠️ ${e?.message || "Erro"}`);
    } finally {
      setSyncing(false);
    }
  }

  // Fetch appointment data from the API. Accepts a date range and filters.
  async function fetchRange(di: string, df: string, p: string, st: string, q: string) {
    const qs = new URLSearchParams({ datai: di, dataf: df, prof: p === "ALL" ? "" : p, status: st === "ALL" ? "" : st, q: q || "", mode });
    const res = await fetch(`/api/konsist/agendamentos?${qs.toString()}`, { cache: "no-store", credentials: "include" });
    const rawText = await res.text();
    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(`Resposta não‑JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
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
    // Flatten the array in case the API wraps results in nested arrays.
    const flat = Array.isArray(items) ? items : [];
    return flat;
  }

  // Prefetch a range of dates in 4‑day chunks to minimise API calls. Restores the
  // missing declaration that caused a syntax error in the original version.
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
            setRaw((prev) => [...(Array.isArray(prev) ? prev : []), ...flat]);
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

  // Initial load – prefetch the next 30 days on mount.
  useEffect(() => {
    prefetch30DiasAuto();
    setSelectedDate(new Date());
  }, []);

  const professionals = useMemo(() => {
    const set = new Set<string>();
    flattenedRaw.forEach((x) => {
      const p =
        (x as any)?.agendamento_medico ||
        (x as any)?.profissional ||
        (x as any)?.profissional_nome ||
        (x as any)?.profissionalNome ||
        (x as any)?.medico ||
        (x as any)?.nutricionista ||
        (x as any)?.nome_medico ||
        (x as any)?.nomeProfissional;
      if (p) set.add(String(p));
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flattenedRaw]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    flattenedRaw.forEach((x) => {
      const s =
        (x as any)?.agendamento_status ??
        (x as any)?.status ??
        (x as any)?.situacao ??
        (x as any)?.status_nome ??
        (x as any)?.statusNome;
      const norm = normalizeStatus(s);
      if (norm) set.add(norm);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [flattenedRaw]);

  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    return flattenedRaw.filter((x) => {
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
  }, [flattenedRaw, prof, status, search]);

  const events = useMemo(() => {
    // Build the event list from the filtered Konsist data.  We need to be
    // careful when extracting date/time since Konsist may return objects like
    // `{ data: '01/02/2024' }` instead of plain strings.  Use extractValue to
    // coerce values to strings where possible.  If we cannot find a valid
    // date string we skip the event.
    const seen = new Set<string>();
    const out: any[] = [];
    for (let idx = 0; idx < filtered.length; idx++) {
      const x = filtered[idx];
      const paciente = String(x?.paciente || "Paciente").trim();
      const profNome = String(
        x?.agendamento_medico || x?.profissional || x?.profissional_nome || ""
      ).trim() || "-";
      const stRaw = x?.agendamento_status ?? x?.status ?? x?.situacao ?? "";
      const st = normalizeStatus(stRaw);
      // safely extract date and time strings.  The Konsist API may return
      // these values either as plain strings or as nested objects.  When
      // agendamento_data/agendamento_hora are provided as strings we
      // simply trim them.  If they come in Brazilian format (DD/MM/YYYY)
      // we convert them to ISO using brToISO.  We avoid treating them
      // like objects here because in practice Konsist returns plain
      // strings and the previous implementation attempting to walk
      // object keys was causing the date to be lost.  If no date can
      // be resolved the event is skipped.
      let dateStrRaw: any = x?.agendamento_data;
      let timeStrRaw: any = x?.agendamento_hora;
      // fallback to alternate property names when available
      if (!dateStrRaw && x && typeof x === "object") {
        dateStrRaw = (x as any).data ?? (x as any).agendamentoData ?? null;
      }
      if (!timeStrRaw && x && typeof x === "object") {
        timeStrRaw = (x as any).hora ?? (x as any).agendamentoHora ?? null;
      }
      let dateStr: string | null = dateStrRaw ? String(dateStrRaw).trim() : null;
      let timeStr: string | null = timeStrRaw ? String(timeStrRaw).trim() : null;
      // Convert Brazilian date format (DD/MM/YYYY) to ISO (YYYY-MM-DD)
      if (dateStr && dateStr.includes("/")) {
        dateStr = brToISO(dateStr);
      }
      // require at least a valid date; time is optional
      if (!dateStr) {
        console.warn("⛔ Agendamento sem data:", x);
        continue;
      }
      // build start string: if time exists append with 'T', else rely on date only
      const startStr = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}`;
      const dt = new Date(startStr);
      if (isNaN(dt.getTime())) {
        console.warn("⛔ Data inválida:", startStr, x);
        continue;
      }
      // end time is 30 minutes after start
      const endDt = new Date(dt);
      endDt.setMinutes(endDt.getMinutes() + 30);
      const endStr = toLocalISO(endDt);
      // ensure start has at least yyyy-mm-dd format
      if (!startStr || startStr.length < 10) {
        console.warn("🚨 Evento descartado (start inválido)", {
          data: dateStr,
          hora: timeStr,
          startGerado: startStr,
          raw: x,
        });
        continue;
      }
      const dedupeKey = `${paciente.toLowerCase()}|${profNome.toLowerCase()}|${String(startStr)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const title = mode === "admin" ? `${paciente} • ${profNome}` : `${paciente}`;
      const color = statusColorNormalized(st);
      out.push({
        id: String(
          x?.id ||
            x?.idagendamento ||
            x?.agendamento_chave ||
            x?.agendamento_chave ||
            x?.idpaciente ||
            idx
        ),
        title,
        start: startStr,
        end: endStr,
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
  const needsProfessionalLink = mode === "professional" && !defaultProfessional;
  function fmtHeaderDay(d: Date) {
    const isToday = toISODate(d) === toISODate(new Date());
    const month = d.toLocaleString("pt-BR", { month: "long" });
    const day = d.getDate();
    const label = `${month.charAt(0).toUpperCase()}${month.slice(1)} ${day}`;
    return { left: isToday ? "HOJE" : "DIA", right: label };
  }
  if (needsProfessionalLink) {
    return (
      // Wrap content in a fragment to ensure a single top-level JSX node. Comments
      // must be nested inside the fragment or returned element to avoid
      // compilation errors. Using min-h-screen prevents vertical overflow.
      <>
        {/*
         * Use min-h-screen instead of calculating (100vh-1px) to avoid excessive
         * page height that forces a vertical scrollbar. We also hide overflow on
         * the y-axis to make the interface feel more compact.
         */}
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
          <div className="mx-auto max-w-2xl p-4 sm:p-6">
            <h1 className="text-xl font-black mb-2">Minha Agenda</h1>
            <p className="text-sm text-slate-400 mb-4">
              Para ver a agenda, você precisa vincular qual profissional do Konsist é você.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-black mb-2">Status do vínculo</div>
              {proReq?.status ? (
                <div className="text-sm text-white/75 mb-3">
                  Solicitação: <b>{proReq.requestedProfessional}</b>
                  <br />
                  Status: <b>{proReq.status}</b>
                </div>
              ) : (
                <div className="text-sm text-white/70 mb-3">Nenhuma solicitação enviada ainda.</div>
              )}
              <div className="grid gap-2">
                <label className="text-xs text-white/70 font-extrabold">Escolha seu nome no Konsist</label>
                <select
                  className="w-full rounded-xl bg-slate-950/50 border border-white/10 px-3 py-2 text-sm font-black"
                  value={requestProf}
                  onChange={(e) => setRequestProf(e.target.value)}
                >
                  {prosList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={requestProfessionalLink}
                  disabled={requesting || !requestProf}
                  className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold hover:bg-blue-700 disabled:opacity-50"
                >
                  {requesting ? "Enviando…" : "Solicitar vínculo"}
                </button>
                {reqMsg ? <div className="text-sm mt-2">{reqMsg}</div> : null}
                <div className="mt-3 text-xs text-white/60">
                  Dica: se você ainda não vinculou sua agenda Google, vá em{' '}
                  <a className="underline" href="/settings/calendar">
                    Configurações → Google Calendar
                  </a>
                  .
                </div>
                {/*
                 * Adiciona um botão para permitir que o profissional solicite a sincronização
                 * com o Google Calendar diretamente a partir desta tela inicial. O botão
                 * reutiliza a função syncGoogleNow já definida para realizar o POST
                 * de sincronização e exibe o resultado no indicador de sincronização.
                 */}
                <button
                  type="button"
                  onClick={syncGoogleNow}
                  className="mt-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700"
                >
                  Sincronizar Google Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
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
        @media (max-width: 640px) {
          .fc .fc-header-toolbar {
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .fc .fc-toolbar-chunk {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
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
      {/*
       * Use min-h-screen here as well when waiting for professional link to
       * ensure the page doesn't extend beyond the viewport height.  Hide
       * overflow on the y-axis to remove unnecessary scrollbars.
       */}
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
        <div className="mx-auto max-w-[1600px] px-3 py-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-black">{title || (mode === "admin" ? "Agenda Geral" : "Minha Agenda")}</h1>
              <p className="text-sm text-slate-400">{subtitle || (mode === "admin" ? "Visão administrativa" : "Visão do profissional")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <span className="text-slate-400">Range:</span>{' '}
                <span className="font-bold">{datai}</span> →{' '}
                <span className="font-bold">{dataf}</span>
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
              {(mode === 'professional' || mode === 'admin') && appUser?.googleCalendar?.calendarId ? (
                <button
                  onClick={syncGoogleNow}
                  className={cx(
                    "rounded-full px-5 py-2.5 text-sm font-extrabold",
                    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_16px_40px_rgba(16,185,129,.18)]",
                    syncing && "opacity-70"
                  )}
                  disabled={syncing}
                >
                  {syncing ? "Sincronizando..." : "Sync Google"}
                </button>
              ) : null}
            </div>
          </div>
          <ProgressBar show={prog.running || loading} label={`Carregando agenda: ${prog.done}/${prog.total || 0} blocos (4 dias cada)`} percent={percent} sub={prog.current ? `Agora: ${prog.current}` : undefined} />
          {syncMsg ? (
            <div className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {syncMsg}
            </div>
          ) : null}
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
                    ].map(([k, lbl]) => (
                      <button
                        key={k}
                        onClick={() => setTab(k as any)}
                        className={cx(
                          "w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-extrabold",
                          tab === k ? "bg-white/10" : "hover:bg-white/10"
                        )}
                      >
                        <span className={cx(
                          "h-10 w-10 rounded-2xl grid place-items-center",
                          tab === k ? "bg-blue-600/30" : "bg-white/5"
                        )}>
                          ●
                        </span>
                        <div className="leading-tight">
                          <div className="text-sm">{lbl}</div>
                          <div className="text-xs text-slate-400">
                            {k === "agenda"
                              ? "Visão do dia"
                              : k === "filtros"
                              ? "Profissional / status"
                              : "Cores por status"}
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
                            disabled={mode === "professional"}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-2 py-2 text-sm text-slate-100"
                          >
                            {(mode === "professional" && defaultProfessional ? [defaultProfessional] : professionals).map((p) => (
                              <option key={p} value={p}>
                                {p === "ALL" ? "Todos" : p}
                              </option>
                            ))}
                          </select>
                          {mode === "professional" && defaultProfessional ? (
                            <div className="mt-2 text-xs text-slate-400">
                              Vinculado em: <b className="text-slate-200">{defaultProfessional}</b>
                            </div>
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
                      {[
                        "Confirmado",
                        "Não Confirmado",
                        "Desmarcado",
                        "Atendido pelo Medico",
                        "Bloqueado",
                      ].map((s) => (
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
                  {/*
                   * Reduce the calendar height from 76vh to 70vh.  This makes the
                   * interface less vertically stretched and should eliminate
                   * vertical scrolling on most displays.  The width remains
                   * full and we allow horizontal overflow to scroll if
                   * necessary.
                   */}
                  <div className="h-[70vh] w-full overflow-x-auto">
                    <FullCalendar
                      ref={mainRef as any}
                      datesSet={(info) => {
                        // Align fetch to the currently visible month
                        const base = info.start ?? new Date();
                        const di = startOfMonthISO(base);
                        const df = endOfMonthISO(base);
                        setSelectedDate(new Date(base.getFullYear(), base.getMonth(), base.getDate()));
                        setDatai(di);
                        setDataf(df);
                        // Clear cache and prefetch the month
                        setChunks({});
                        setRaw([]);
                        prefetchRangeInChunks(di, df);
                      }}
                      plugins={[timeGridPlugin, interactionPlugin]}
                      initialView="timeGridDay"
                      height="100%"
                      expandRows
                      nowIndicator
                      slotMinTime="06:00:00"
                      slotMaxTime="21:00:00"
                      slotDuration="00:30:00"
                      slotEventOverlap={false}
                      eventOverlap={false}
                      allDaySlot={false}
                      eventMinHeight={38}
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
                        setDrawerData({ paciente: ex.paciente || "-", profissional: ex.profissional || "-", status: ex.status || "Não Confirmado", inicio, fim, raw: ex.raw });
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
                          <div key={st} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200">
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