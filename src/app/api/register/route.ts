export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/getPrisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.email || !body?.password) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const prisma = await getPrisma();

    const email = body.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Usuário já existe" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const isMaster = email === (process.env.MASTER_EMAIL || "").toLowerCase();

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: isMaster ? "MASTER" : "PROFESSIONAL",
        status: isMaster ? "ACTIVE" : "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
