import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/getPrisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
    const body = await req.json();

    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

   const existing = await prisma.user.findUnique({
  where: { email: email.toLowerCase() },
});

if (existing) {
  return NextResponse.json(
    { error: "Este email já está cadastrado. Faça login." },
    { status: 409 }
  );
}
    const hashed = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
  data: {
    email: email.toLowerCase(),
    name: name || null,
    password: hashed,
    status: "PENDING",
    role: "PROFESSIONAL",
  },
});


    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return NextResponse.json(
      { error: "Erro interno ao registrar usuário" },
      { status: 500 }
    );
  }
}
