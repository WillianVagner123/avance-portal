import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  const appUser = session?.appUser;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!appUser) {
    return NextResponse.json({ ok: false, error: "no_app_user" }, { status: 403 });
  }

  const last = await prisma.professionalLinkRequest.findFirst({
    where: { userId: appUser.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    linked: appUser.konsistMedicoNome || null,
    request: last
      ? {
          id: last.id,
          status: last.status,
          requestedProfessional: last.requestedProfessional,
          approvedProfessional: last.approvedProfessional,
          createdAt: last.createdAt,
        }
      : null,
  });
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  const appUser = session?.appUser;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!appUser || (appUser.status !== "ACTIVE" && appUser.role !== "MASTER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const requestedProfessional = String((body as any)?.requestedProfessional || "").trim();
  if (!requestedProfessional) {
    return NextResponse.json({ ok: false, error: "missing_requestedProfessional" }, { status: 400 });
  }

  // Evita spam: se já existe PENDING igual, não cria outro.
  const existing = await prisma.professionalLinkRequest.findFirst({
    where: { userId: appUser.id, status: "PENDING", requestedProfessional },
    orderBy: { createdAt: "desc" },
  });

  if (!existing) {
    await prisma.professionalLinkRequest.create({
      data: {
        userId: appUser.id,
        requestedProfessional,
        status: "PENDING",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
