import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // Ajuste o caminho
import { getPrisma } from "@/lib/getPrisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { requestedProfessional } = await req.json();

    // Atualiza o usuário com a solicitação pendente
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        professionalLinkRequest: {
          status: "PENDENTE",
          requestedProfessional: requestedProfessional,
          requestedAt: new Date()
        }
      }
    });

    return NextResponse.json({ 
      ok: true, 
      latest: updatedUser.professionalLinkRequest 
    });

  } catch (error) {
    return NextResponse.json({ ok: false, error: "Erro ao processar" }, { status: 500 });
  }
}