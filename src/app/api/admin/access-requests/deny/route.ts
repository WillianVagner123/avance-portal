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

  const contentType = req.headers.get("content-type") || "";
  let id = "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    id = String(body.id || "");
  } else {
    const fd = await req.formData();
    id = String(fd.get("id") || "");
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const reqRow = await prisma.accessRequest.findUnique({ where: { id } });
  if (!reqRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.accessRequest.update({
      where: { id },
      data: {
        status: "DENIED",
        reviewedBy: actorEmail,
        reviewedAt: new Date(),
      },
    });

    if (reqRow.userId) {
      await tx.user.update({
        where: { id: reqRow.userId },
        data: { status: "DENIED" },
      });
    }

    try {
      // @ts-ignore
      await tx.auditLog.create({
        data: {
          actorEmail,
          action: "ACCESS_REQUEST_DENIED",
          target: reqRow.email,
          meta: JSON.stringify({ requestId: id }),
        },
      });
    } catch {}
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/admin/requests", req.url));
  }

  return NextResponse.json({ ok: true });
}
