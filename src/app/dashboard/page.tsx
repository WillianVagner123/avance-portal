import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) redirect("/login");

  return (
    <main className="min-h-screen p-6 bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-300">
          Você está logado como: <b>{session?.user?.email}</b>
        </p>
      </div>
    </main>
  );
}
