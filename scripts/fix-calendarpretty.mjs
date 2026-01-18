import fs from "fs";

const FILE = "src/app/admin/calendar-konsist/CalendarPretty.tsx";
let s = fs.readFileSync(FILE, "utf8");

// 1) Corrige mainRef quebrado
s = s.replace(
  /const\s+mainRef\s*=\s*useRef<FullCalendar[\s\S]*?\(null\);/m,
  'const mainRef = useRef<FullCalendar | null>(null);'
);

// 2) Remove prefetch30DiasAuto que foi colado dentro do Drawer (se existir)
s = s.replace(
  /\/\/ ==========================\s*\n\/\/ 🔹 Prefetch automático[\s\S]*?setLoading\(false\);\s*\n}\s*\n\s*\n/ m,
  ""
);

// 3) Garante renderEventContent (se não existir)
if (!s.includes("function renderEventContent(arg: any)")) {
  s = s.replace(
    /export default function CalendarPretty\(/,
`// ==========================
// 🔹 Render mínimo do evento (sempre mostra paciente)
// ==========================
function renderEventContent(arg: any) {
  const ex = arg?.event?.extendedProps || {};
  const paciente = String(ex?.paciente || "Paciente").trim();
  const parts = paciente.split(/\\s+/).filter(Boolean);
  const short = parts.length <= 2 ? paciente : \`\${parts[0]} \${parts[parts.length - 1]}\`;

  return (
    <div className="flex flex-col leading-tight">
      <div className="text-[12px] font-black truncate">{short}</div>
    </div>
  );
}

export default function CalendarPretty(`
  );
}

// 4) Injeta props no <FullCalendar ...> (eventContent + displayEventTime)
s = s.replace(
  /<FullCalendar\s*\n([\s\S]*?)plugins=\{\[timeGridPlugin, interactionPlugin\]\}/m,
  (m) => {
    if (m.includes("eventContent={renderEventContent}")) return m;
    return m.replace(
      /<FullCalendar\s*\n/,
      `<FullCalendar
                      eventContent={renderEventContent}
                      displayEventTime={true}
`
    );
  }
);

// 5) Garante dedupe por paciente+prof+start (se já existe, não mexe)
if (!s.includes("const dedupeKey =")) {
  s = s.replace(
    /const start = brToISO\([\s\S]*?\);\s*\n\s*if \(!start[\s\S]*?continue;\s*\n/m,
    (block) => block // deixa como está (dedupe pode estar mais abaixo)
  );
}

// 6) Insere prefetch30DiasAuto dentro do CalendarPretty (se não existir)
if (!s.includes("async function prefetch30DiasAuto()")) {
  s = s.replace(
    /const \[googleLinked, setGoogleLinked\] = useState\(false\);\s*\n/m,
`const [googleLinked, setGoogleLinked] = useState(false);

// ==========================
// 🔹 Prefetch automático D → D+30 (ciclos de 4 dias / limite Konsist)
// ==========================
async function prefetch30DiasAuto() {
  const start = new Date();
  const totalDias = 30;
  const step = 4;

  const diUI = toISODate(start);
  const dfUI = toISODate(addDays(start, totalDias));
  setDatai(diUI);
  setDataf(dfUI);

  setError("");
  setLoading(true);

  try {
    for (let i = 0; i <= totalDias; i += step) {
      const di = toISODate(addDays(start, i));
      const df = toISODate(addDays(start, Math.min(i + step - 1, totalDias)));

      const key = \`\${di}_\${df}_\${prof}_\${status}_\${(search || "").trim().toLowerCase()}\`;
      if (chunks[key]) continue;

      try {
        const flat = await fetchRange(di, df, prof, status, search);

        setChunks((prev) => ({ ...prev, [key]: flat }));

        // junta tudo com dedupe (mesmo paciente+prof+data+hora)
        setRaw((prev) => {
          const merged = [...prev, ...flat];
          const seen = new Set();
          const out = [];

          for (const x of merged) {
            const paciente = String(x?.paciente || "").trim().toLowerCase();
            const profNome = String(x?.agendamento_medico || x?.profissional || "").trim().toLowerCase();
            const d = String(x?.agendamento_data || "").trim();
            const h = String(x?.agendamento_hora || "").trim();
            const sig = \`\${paciente}|\${profNome}|\${d}|\${h}\`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            out.push(x);
          }
          return out;
        });
      } catch (e) {
        console.warn("Falha no chunk", di, df);
      }
    }
  } finally {
    setLoading(false);
  }
}
`
  );
}

// 7) Chama prefetch automático no mount
s = s.replace(
  /useEffect\(\(\) => \{\s*\n\s*\/\/ sempre D → D\+30[\s\S]*?\n\s*\}, \[\]\);/m,
  `useEffect(() => {
    // sempre D → D+30 e carrega em chunks de 4 dias (limite Konsist)
    prefetch30DiasAuto();
    setSelectedDate(new Date());
  }, []);`
);

// Se não achar aquele useEffect, injeta um novo (fallback)
if (!s.includes("prefetch30DiasAuto();")) {
  s = s.replace(
    /useEffect\(\(\) => \{\s*\n\s*\/\/ status do vínculo \(back-end\)[\s\S]*?\n\s*\}, \[\]\);\s*\n/m,
`useEffect(() => {
    prefetch30DiasAuto();
    setSelectedDate(new Date());
  }, []);

useEffect(() => {
    // status do vínculo (back-end)
`
  );
}

fs.writeFileSync(FILE, s);
console.log("OK: CalendarPretty corrigido:", FILE);
