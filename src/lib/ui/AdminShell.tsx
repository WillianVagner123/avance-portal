import Link from "next/link";

type Item = { href: string; title: string; desc?: string; tag?: string };

const ITEMS: Item[] = [
  { href: "/admin/calendar-konsist", title: "Calendário (Konsist)", desc: "Agenda diária, filtros, status, atualização" , tag:"KONSIST" },
  { href: "/admin/professionals", title: "Profissionais", desc: "Lista + vínculo Konsist/Google", tag:"EQUIPE" },
  { href: "/admin/patients", title: "Pacientes", desc: "Busca + histórico + próximos atendimentos", tag:"PACIENTE" },
  { href: "/admin/logs", title: "Logs", desc: "Auditoria e eventos do sistema", tag:"AUDIT" },
  { href: "/admin/calendar-links", title: "Vinculações", desc: "Email ↔ Profissional ↔ Google Calendar", tag:"LINK" },
];

export default function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "320px 1fr" }}>
      <aside style={{ padding: 18, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="av-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(35,209,139,0.35), rgba(43,188,255,0.18))",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
            <div>
              <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>AVANCE</div>
              <div className="av-muted" style={{ fontSize: 12 }}>
                Admin Console
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="av-chip"><span style={{ color: "var(--brand)" }}>●</span> MASTER</span>
            <span className="av-chip">Saúde • Longevidade</span>
          </div>
        </div>

        <div style={{ marginTop: 14 }} className="av-grid">
          {ITEMS.map((it) => (
            <Link key={it.href} href={it.href} className="av-card" style={{ padding: 14, display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 750 }}>{it.title}</div>
                {it.tag ? <span className="av-chip">{it.tag}</span> : null}
              </div>
              {it.desc ? <div className="av-muted" style={{ marginTop: 6, fontSize: 13 }}>{it.desc}</div> : null}
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="av-btn" href="/dashboard">Modo Profissional</Link>
          <Link className="av-btn" href="/settings/calendar">Google Calendar</Link>
          <Link className="av-btn" href="/logout">Sair</Link>
        </div>
      </aside>

      <main style={{ padding: 22 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="av-h1">{title}</div>
          {subtitle ? <div className="av-muted">{subtitle}</div> : null}
        </div>

        <div className="av-card" style={{ padding: 18 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
