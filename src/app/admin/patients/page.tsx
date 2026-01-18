export const runtime = "nodejs";
import AdminShell from "@/lib/ui/AdminShell";

export default async function AdminPatients() {
  return (
    <AdminShell title="Pacientes" subtitle="Nesta fase: virá do Konsist (agendamentos). Depois: histórico e busca.">
      <div className="av-muted" style={{ lineHeight: 1.6 }}>
        Aqui vamos montar:
        <ul>
          <li>Busca por nome / telefone / email</li>
          <li>Próximos atendimentos</li>
          <li>Histórico por paciente</li>
        </ul>
        Por enquanto, foque em <b>Calendário (Konsist)</b>.
      </div>
    </AdminShell>
  );
}
