export const dynamic = "force-dynamic";
export const revalidate = 0;

export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export default async function AdminUsers() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Usuários</h1>

      <div style={{ display: "grid", gap: 12 }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{u.email}</div>
                <div style={{ opacity: 0.85 }}>
                  {u.name || "-"} • role: {u.role} • status: {u.status}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <form method="post" action="/api/admin/users/set-status">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="status" value="ACTIVE" />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Ativar
                  </button>
                </form>

                <form method="post" action="/api/admin/users/set-status">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="status" value="DENIED" />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Bloquear
                  </button>
                </form>
              </div>
            </div>

            <div style={{ opacity: 0.7, marginTop: 8 }}>
              criado: {new Date(u.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
