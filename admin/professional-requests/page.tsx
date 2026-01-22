export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";

export default async function AdminProfessionalRequests() {
  const requests = await prisma.professionalLinkRequest.findMany({
    where: { status: "PENDING" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <h1 className="text-xl font-black mb-2">Pedidos de vínculo de profissional (Konsist)</h1>
      <p className="text-sm text-white/70 mb-4">
        O profissional solicita qual agenda do Konsist ele deve ver. Aqui o MASTER aprova/nega.
      </p>

      {requests.length === 0 ? (
        <div className="text-sm text-white/70">Nenhum pedido pendente.</div>
      ) : (
        <div className="grid gap-3">
          {requests.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-extrabold">{r.user?.email}</div>
              <div className="text-sm text-white/75 mt-2">
                Solicitado: <span className="font-extrabold">{r.requestedProfessional}</span>
                <br />
                Criado em: {new Date(r.createdAt).toLocaleString()}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <form method="post" action="/api/admin/professional-requests/approve" className="flex flex-col sm:flex-row gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    name="approvedProfessional"
                    placeholder="Nome EXATO aprovado (pode ajustar)"
                    defaultValue={r.requestedProfessional}
                    className="w-full sm:flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl border border-white/10 bg-blue-600 px-4 py-2 text-sm font-extrabold hover:bg-blue-700">
                    Aprovar
                  </button>
                </form>

                <form method="post" action="/api/admin/professional-requests/deny" className="w-full sm:w-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="w-full sm:w-auto rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold hover:bg-white/10">
                    Negar
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
