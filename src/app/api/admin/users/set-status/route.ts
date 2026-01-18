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
  let userId = "";
  let status = "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    userId = String(body.userId || "");
    status = String(body.status || "");
  } else {
    const fd = await req.formData();
    userId = String(fd.get("userId") || "");
    status = String(fd.get("status") || "");
  }

  if (!userId || !status) return NextResponse.json({ error: "Missing userId/status" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status: status as any },
  });

  // AuditLog (se existir)
  try {
    // @ts-ignore
    await prisma.auditLog.create({
      data: {
        actorEmail,
        action: "USER_SET_STATUS",
        target: updated.email,
        meta: JSON.stringify({ userId, status }),
      },
    });
  } catch {}

  // Se veio de form POST, redireciona de volta
  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/admin/users", req.url));
  }

  return NextResponse.json({ ok: true, user: { id: updated.id, email: updated.email, status: updated.status } });
}
