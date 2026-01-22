export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  const role = session?.appUser?.role;
  const actorEmail = (session?.user?.email || "").toLowerCase();

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fd = await req.formData();
  const requestId = String(fd.get("id") || "");
  const approvedProfessional = String(fd.get("approvedProfessional") || "").trim();

  if (!requestId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!approvedProfessional) return NextResponse.json({ error: "Missing approvedProfessional" }, { status: 400 });

  const reqRow = await prisma.professionalLinkRequest.findUnique({ where: { id: requestId } });
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.professionalLinkRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        approvedProfessional,
        reviewedBy: actorEmail,
        reviewedAt: new Date(),
      },
    });

    // Vínculo efetivo no usuário (usado no portal)
    await tx.user.update({
      where: { id: reqRow.userId },
      data: { konsistMedicoNome: approvedProfessional },
    });

    // Mantém também o mapa (útil pro admin e para consistência)
    await tx.konsistProfessionalMap.upsert({
      where: { userId: reqRow.userId },
      create: { userId: reqRow.userId, konsistProfissionalNome: approvedProfessional },
      update: { konsistProfissionalNome: approvedProfessional },
    });
  });

  return NextResponse.redirect(new URL("/admin/professional-requests", req.url));
}
