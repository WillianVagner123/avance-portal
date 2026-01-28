export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getPrisma } from "@/lib/getPrisma";

export default async function AdminRequests() {
  const prisma = await getPrisma();
  const requests = await prisma.accessRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Pedidos pendentes</h1>

      {requests.length === 0 ? (
        <p style={{ opacity: 0.8 }}>Nenhum pedido pendente.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {requests.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700 }}>{r.email}</div>
              <div style={{ opacity: 0.85, marginBottom: 10 }}>
                Nome: {r.name || "-"} â€¢ Criado em: {new Date(r.createdAt).toLocaleString()}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <form method="post" action="/api/admin/access-requests/approve">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Aprovar
                  </button>
                </form>

                <form method="post" action="/api/admin/access-requests/deny">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
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


