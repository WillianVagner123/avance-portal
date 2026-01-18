import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session: any = await getServerSession();
  if (!session) redirect("/login");

  const appUser = session.appUser;
  if (appUser?.status !== "ACTIVE") redirect("/pending");

  return (
    <main className="min-h-screen p-6 bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        <div className="mt-4 rounded-2xl bg-white/10 border border-white/15 p-5">
          <p className="text-zinc-200">
            Você está logado como: <b>{session.user?.email}</b>
          </p>

          <p className="mt-2 text-zinc-300">
            Role: <b>{appUser.role}</b>
          </p>

          <p className="mt-2 text-zinc-300">
            Nome Konsist vinculado:{" "}
            <b>{appUser.konsistMedicoNome || "Ainda não vinculado"}</b>
          </p>
        </div>
      </div>
    </main>
  );
}
