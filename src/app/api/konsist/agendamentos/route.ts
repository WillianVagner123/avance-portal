import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const r = await fetch("http://8.242.28.133:8443/agendamentos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.KONSIST_BEARER}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("[KONSIST][RAW ERROR]", t);
      return NextResponse.json({ error: "Erro Konsist" }, { status: 500 });
    }

    const json = await r.json();

    // 🔁 FLATTEN (esse passo é ESSENCIAL)
    const out: any[] = [];

    for (const row of json?.Resultado || []) {
      for (const ag of row?.agendamento || []) {
        out.push({
          paciente: row.paciente,
          agendamento_medico: ag.agendamento_medico,
          agendamento_status: ag.agendamento_status,
          agendamento_inicio: `${ag.agendamento_data} ${ag.agendamento_hora}`,
          raw: ag,
        });
      }
    }

    console.log("[KONSIST][FLAT SAMPLE]", out[0]);

    return NextResponse.json(out);
  } catch (e) {
    console.error("[KONSIST][API ERROR]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
