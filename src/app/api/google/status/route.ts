import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ Stub: depois você troca pra ler do Prisma (refresh_token salvo)
export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ linked: false });

  // enquanto não persistir, retorna false (mas não dá 404)
  return NextResponse.json({ linked: false });
}
