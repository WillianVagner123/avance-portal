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
  if (!requestId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.professionalLinkRequest.update({
    where: { id: requestId },
    data: { status: "DENIED", reviewedBy: actorEmail, reviewedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/admin/professional-requests", req.url));
}
