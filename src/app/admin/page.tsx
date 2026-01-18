export const runtime = "nodejs";

const cardStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.25)",
  textDecoration: "none",
  display: "block",
};

export default function AdminHome() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10 }}>Admin — Avance</h1>
      <div style={{ opacity: 0.8, marginBottom: 18 }}>
        Centro de controle: calendário Konsist, profissionais, pacientes, logs e vinculações.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <a href="/admin/calendar-konsist" style={cardStyle}>📅 Calendário (Konsist)</a>
        <a href="/admin/users" style={cardStyle}>👩‍⚕️ Profissionais</a>
        <a href="/admin/requests" style={cardStyle}>✅ Solicitações</a>
        <a href="/admin/logs" style={cardStyle}>🧾 Logs</a>
        <a href="/admin/calendar-links" style={cardStyle}>🔗 Vinculações</a>
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/logout" style={{ ...cardStyle, textAlign: "center" }}>Sair</a>
      </div>
    </div>
  );
}
