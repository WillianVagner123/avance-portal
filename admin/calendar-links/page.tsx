export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getPrisma } from "@/lib/getPrisma";

export default async function AdminCalendarLinksPage() {
  const links = await (await getPrisma()).googleCalendarLink.findMany({
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });

  const maps = await (await getPrisma()).konsistProfessionalMap.findMany();
  const mapByUserId = new Map(maps.map((m: (typeof maps)[number]) => [m.userId, m]));

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <h1 className="text-xl font-black mb-2">Autorizar vÃ­nculo (Email â†” Profissional)</h1>
      <p className="text-sm text-white/70 mb-4">
        O profissional escolhe a agenda dele. Aqui o MASTER valida e aprova o vÃ­nculo com o nome do profissional no Konsist.
      </p>

      <div className="grid gap-3">
        {links.map((l: any) => {
          const m = mapByUserId.get(l.userId);
          return (
            <div
              key={l.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="font-extrabold">{l.user.email}</div>
              <div className="text-sm text-white/75 mt-2">
                Agenda: {l.calendarName || "-"} ({l.calendarId || "-"})<br />
                Refresh token: {l.refreshToken ? "âœ…" : "âš ï¸ (reauthorize)"}<br />
                Profissional (Konsist): {(m as any)?.konsistProfissionalNome || "-"}<br />
                Aprovado: {l.approved ? "âœ… SIM" : "â³ NÃƒO"}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <form
                  method="post"
                  action="/api/admin/calendar-links/approve"
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input type="hidden" name="userId" value={l.userId} />
                  <input
                    name="konsistProfissionalNome"
                    placeholder="Nome EXATO do profissional no Konsist"
                    defaultValue={(m as any)?.konsistProfissionalNome || ""}
                    className="w-full sm:flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl border border-white/10 bg-blue-600 px-4 py-2 text-sm font-extrabold hover:bg-blue-700">
                    Aprovar
                  </button>
                </form>

                <form method="post" action="/api/admin/calendar-links/deny" className="w-full sm:w-auto">
                  <input type="hidden" name="userId" value={l.userId} />
                  <button type="submit" className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold hover:bg-white/10">
                    Revogar
                  </button>
                </form>
              </div>

              <div className="text-xs text-white/60 mt-3">atualizado: {new Date(l.updatedAt).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

