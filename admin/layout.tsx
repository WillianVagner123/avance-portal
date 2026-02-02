export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session: any = await getServerSession(authOptions);
  const role = (session as any)?.appUser?.role;

  if (!session?.user?.email) redirect("/login");
  if (role !== "MASTER") redirect("/");

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <a href="/admin">Admin</a>
        <a href="/admin/requests">Requests</a>
        <a href="/admin/users">Users</a>
        <a href="/admin/logs">Logs</a>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          {session.user.email}
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
        {children}
      </div>
    </div>
  );
}
