export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export default async function AdminCalendarLinksPage() {
  const links = await prisma.googleCalendarLink.findMany({
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });

  const maps = await prisma.konsistProfessionalMap.findMany();
  const mapByUserId = new Map(maps.map((m: (typeof maps)[number]) => [m.userId, m]));

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Autorizar vínculo (Email ↔ Profissional)</h1>
      <p style={{ opacity: 0.85, marginBottom: 14 }}>
        O profissional escolhe a agenda dele. Aqui o MASTER valida e aprova o vínculo com o nome do profissional no Konsist.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {links.map((l: any) => {
          const m = mapByUserId.get(l.userId);
          return (
            <div
              key={l.id}
              style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}
            >
              <div style={{ fontWeight: 700 }}>{l.user.email}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                Agenda: {l.calendarName || "-"} ({l.calendarId || "-"})<br />
                Refresh token: {l.refreshToken ? "✅" : "⚠️ (reauthorize)"}<br />
                Profissional (Konsist): {m?.konsistProfissionalNome || "-"}<br />
                Aprovado: {l.approved ? "✅ SIM" : "⏳ NÃO"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <form
                  method="post"
                  action="/api/admin/calendar-links/approve"
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  <input type="hidden" name="userId" value={l.userId} />
                  <input
                    name="konsistProfissionalNome"
                    placeholder="Nome EXATO do profissional no Konsist"
                    defaultValue={m?.konsistProfissionalNome || ""}
                    style={{ padding: 8, borderRadius: 10, minWidth: 340 }}
                  />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Aprovar
                  </button>
                </form>

                <form method="post" action="/api/admin/calendar-links/deny">
                  <input type="hidden" name="userId" value={l.userId} />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Revogar
                  </button>
                </form>
              </div>

              <div style={{ opacity: 0.7, marginTop: 10 }}>atualizado: {new Date(l.updatedAt).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
