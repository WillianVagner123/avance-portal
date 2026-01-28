import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/getPrisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, name } = body || {};

  if (!email || !password) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const prisma = await getPrisma();

  const exists = await prisma.user.findUnique({
    where: { email },
  });

  if (exists) {
    return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hash,
      name: name || null,
    },
  });

  return NextResponse.json({ ok: true });
}
