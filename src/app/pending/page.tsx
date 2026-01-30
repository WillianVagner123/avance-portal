export const runtime = "nodejs";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";


export default async function PendingPage() {
  const session: any = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) redirect("/login");
  if (appUser?.role === "MASTER") redirect("/admin");
  if (appUser?.status === "ACTIVE") redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ padding: 18, width: "min(520px, 92vw)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Aguardando aprovação</div>
        <div style={{ opacity: 0.8, marginBottom: 14 }}>
          Seu acesso está pendente. Um administrador precisa aprovar seu cadastro.
        </div>
        <div style={{ opacity: 0.85 }}>
          Email: <b>{session.user.email}</b>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <a href="/logout" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)" }}>Sair</a>
          <a href="/login" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)" }}>Tentar novamente</a>
        </div>
      </div>
    </div>
  );
}
