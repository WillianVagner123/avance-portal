import { NextResponse } from "next/server";

function normalizeStatus(s: any) {
  const t = String(s || "").toLowerCase();
  if (["confirmado", "c"].includes(t)) return "Confirmado";
  if (["desmarcado", "cancelado", "d"].includes(t)) return "Desmarcado";
  if (["atendido", "realizado", "m"].includes(t)) return "Atendido pelo Medico";
  if (["bloqueado", "b"].includes(t)) return "Bloqueado";
  return "Não Confirmado";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const datai = searchParams.get("datai");
  const dataf = searchParams.get("dataf");
  const prof = searchParams.get("prof");
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase();

  // 🔥 AQUI você chama o Konsist ou banco real
  const konsistData: any[] = []; // <<< substituir

  const events = konsistData
    .map((x) => {
      const start = x.start;
      const end = x.end || null;
      const st = normalizeStatus(x.status);

      return {
        id: String(x.id),
        start,
        end,
        paciente: x.paciente,
        profissional: x.profissional,
        status: st,
      };
    })
    .filter((x) => {
      if (prof && x.profissional !== prof) return false;
      if (status && x.status !== status) return false;
      if (q && !`${x.paciente} ${x.profissional} ${x.status}`.toLowerCase().includes(q)) return false;
      return true;
    });

  return NextResponse.json({ ok: true, events });
}
