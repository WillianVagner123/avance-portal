import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const requestedProfessional = String((body as any)?.konsistMedicoNome || (body as any)?.requestedProfessional || "").trim();

  if (!requestedProfessional) {
    return NextResponse.json({ ok: false, error: "missing_professional" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  // Agora o vínculo é via aprovação do MASTER.
  await prisma.professionalLinkRequest.create({
    data: { userId: user.id, requestedProfessional, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, pending: true });
}
