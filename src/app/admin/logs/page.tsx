export const runtime = "nodejs";
import AdminShell from "@/lib/ui/AdminShell";

export default async function AdminLogs() {
  return (
    <AdminShell title="Logs" subtitle="Auditoria e eventos. (Depois: tabela + filtros + export)">
      <div className="av-muted" style={{ lineHeight: 1.6 }}>
        Próximo passo: criar uma tabela <b>AuditLog</b> no Prisma e gravar:
        <ul>
          <li>Login</li>
          <li>Aprovação/Revogação</li>
          <li>Sync com Google Calendar</li>
          <li>Pull do Konsist</li>
        </ul>
      </div>
    </AdminShell>
  );
}
