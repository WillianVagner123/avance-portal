import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/getPrisma";

// 🔹 sanitizer universal (BigInt safe)
function sanitizeBigInt(obj: any): any {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(sanitizeBigInt);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeBigInt(v)])
    );
  }
  return obj;
}

export async function GET(req: Request) {
  console.log("🔍 KONSIST AGENDAMENTOS HIT");

  const session = await getServerSession(authOptions);
  console.log("🧠 SESSION:", session?.appUser?.email, session?.appUser?.role);

  if (!session?.appUser || session.appUser.role !== "MASTER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const datai = searchParams.get("datai");
  const dataf = searchParams.get("dataf");

  if (!datai || !dataf) {
    return NextResponse.json(
      { error: "datai e dataf são obrigatórios" },
      { status: 400 }
    );
  }

  const prisma = getPrisma();

  try {
    const agendas = await prisma.agendas.findMany({
      where: {
        agendamento_data: {
          gte: new Date(datai),
          lte: new Date(dataf),
        },
      },
      orderBy: [
        { agendamento_data: "asc" },
        { agendamento_hora: "asc" },
      ],
    });

    return NextResponse.json({
      ok: true,
      data: sanitizeBigInt(agendas),
    });
  } catch (e) {
    console.error("🔥 PRISMA ERROR:", e);
    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 500 }
    );
  }
}
