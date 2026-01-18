export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.appUser?.role;
  const actorEmail = (session?.user?.email || "").toLowerCase();

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fd = await req.formData();
  const userId = String(fd.get("userId") || "");
  const konsistProfissionalNome = String(fd.get("konsistProfissionalNome") || "").trim();

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!konsistProfissionalNome) return NextResponse.json({ error: "Missing konsistProfissionalNome" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.konsistProfessionalMap.upsert({
      where: { userId },
      create: { userId, konsistProfissionalNome },
      update: { konsistProfissionalNome },
    });

    await tx.googleCalendarLink.update({
      where: { userId },
      data: { approved: true, approvedBy: actorEmail, approvedAt: new Date() },
    });
  });

  return NextResponse.redirect(new URL("/admin/calendar-links", req.url));
}
