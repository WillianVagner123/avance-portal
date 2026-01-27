export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API route used for user registration.  It accepts a JSON body with
 * `email`, `name` and `password` and will create a new User with a
 * securely hashed password.  New users are created with PENDING status
 * until an administrator approves their access.  If the email already
 * exists, a 400 error is returned.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
    }
    const email = body.email.toLowerCase().trim();
    const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : null;
    const password = body.password;
    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
    }
    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Usuário já existe" }, { status: 400 });
    }
    // Hash the password with a reasonable cost factor (10).  bcryptjs
    // automatically handles salting.
    const hashed = await bcrypt.hash(password, 10);
    // Determine if this email corresponds to the master account.  The
    // MASTER_EMAIL env var can be configured to automatically elevate a
    // specific user to ACTIVE / MASTER on creation.  Otherwise new
    // users remain pending until approved.
    const masterEmail = (process.env.MASTER_EMAIL || "").toLowerCase();
    const isMaster = email === masterEmail && masterEmail !== "";
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        status: isMaster ? "ACTIVE" : "PENDING",
        role: isMaster ? "MASTER" : "PROFESSIONAL",
      },
    });
    // For non‑master users, create an AccessRequest so an admin can
    // approve their account.  This mirrors the behaviour of the
    // previous Google sign‑in flow.
    if (!isMaster) {
      await prisma.accessRequest.create({
        data: {
          email,
          name: name || undefined,
          status: "PENDING",
          userId: user.id,
        },
      });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}