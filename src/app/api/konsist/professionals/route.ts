import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/getprisma"; // ✅ Nome exato do seu arquivo

export async function GET() {
  try {
    // ✅ Chamamos a função para obter a instância
    const prisma = getPrisma();

    const professionals = await prisma.agendamento.findMany({
      select: { agendamento_medico: true },
      distinct: ['agendamento_medico'],
      where: {
        agendamento_medico: { not: null }
      }
    });

    const list = professionals
      .map(p => p.agendamento_medico)
      .filter((n): n is string => !!n)
      .sort();

    return NextResponse.json({ ok: true, professionals: list });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Erro no banco" }, { status: 500 });
  }
}