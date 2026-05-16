export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <a href="/admin">Admin</a>
        <a href="/admin/requests">Requests</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/logs">Logs</a>
        <a href="/admin/calendar-konsist">Calendário</a>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          Acesso direto
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
        {children}
      </div>
    </div>
  );
}
