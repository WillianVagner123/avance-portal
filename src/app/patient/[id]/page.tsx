export const runtime = "nodejs";

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";


type SP = { searchParams?: Record<string, string | string[] | undefined> };

function spStr(v: any) {
  if (Array.isArray(v)) return v[0] ?? "";
  return String(v ?? "");
}

export default async function PatientPage({ searchParams }: SP) {
  const session: any = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/login");

  const appUser = session?.appUser;
  if (appUser?.status !== "ACTIVE") redirect("/pending");

  const nome = spStr(searchParams?.nome);
  const profissional = spStr(searchParams?.prof);
  const status = spStr(searchParams?.st);
  const inicio = spStr(searchParams?.inicio);
  const fim = spStr(searchParams?.fim);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="text-xs text-slate-400 font-extrabold">PACIENTE</div>
          <h1 className="mt-1 text-2xl font-black text-white">{nome || "Paciente"}</h1>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 font-extrabold">PROFISSIONAL</div>
              <div className="text-sm font-black text-slate-200">{profissional || "-"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 font-extrabold">STATUS</div>
              <div className="text-sm font-black text-white">{status || "-"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="text-xs text-slate-400 font-extrabold">HORÁRIO</div>
              <div className="text-sm font-black text-slate-200">
                {inicio || "-"} {fim ? `→ ${fim}` : ""}
              </div>
            </div>

            <a
              href="/admin/calendar-konsist"
              className="inline-flex justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-extrabold text-white"
            >
              Voltar para o calendário
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
