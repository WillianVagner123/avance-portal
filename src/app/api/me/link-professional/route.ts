import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // se seu projeto usar outro helper, troque aqui

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const konsistMedicoNome = String((body as any)?.konsistMedicoNome || "").trim();

  if (!konsistMedicoNome) {
    return NextResponse.json({ ok: false, error: "missing_professional" }, { status: 400 });
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: { konsistMedicoNome },
  });

  return NextResponse.json({ ok: true });
}
