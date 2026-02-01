import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchKonsistAgendamentos } from "@/lib/konsist";
import { getPrisma } from "@/lib/getPrisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.appUser || session.appUser.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { datai, dataf } = await req.json();
  const prisma = getPrisma();

  const data = await fetchKonsistAgendamentos(datai, dataf);

  let inserted = 0;
  let updated = 0;

  for (const item of data) {
    const chave = BigInt(item.agendamento_chave);

    const existing = await prisma.agendas.findUnique({
      where: { agendamento_chave: chave },
    });

    if (!existing) {
      await prisma.agendas.create({
        data: {
          agendamento_chave: chave,
          paciente: item.paciente,
          telefone: item.telefone,
          agendamento_medico: item.agendamento_medico,
          agendamento_especialidade: item.agendamento_especialidade,
          agendamento_data: item.agendamento_data,
          agendamento_hora: item.agendamento_hora,
          agendamento_status: item.agendamento_status,
          raw: item,
        },
      });
      inserted++;
    } else if (existing.agendamento_status !== item.agendamento_status) {
      await prisma.agendas.update({
        where: { agendamento_chave: chave },
        data: {
          agendamento_status: item.agendamento_status,
          raw: item,
        },
      });

      await prisma.fato_agenda_status_historico.create({
        data: {
          chave: String(chave),
          tipo: "CONSULTA",
          subtipo: item.agendamento_especialidade ?? "N/D",
          status_antigo: existing.agendamento_status,
          status_novo: item.agendamento_status,
          data: item.agendamento_data,
          hora: item.agendamento_hora,
          paciente: item.paciente,
        },
      });

      updated++;
    }
  }

  return NextResponse.json({
    fetched: data.length,
    inserted,
    updated,
  });
}
