import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  // se o seu session não tiver user.id, ajusta pra email (abaixo)
  const userId = (session as any)?.user?.id as string | undefined;

  if (!userId) return NextResponse.json({ linked: false });

  const link = await prisma.googleCalendarLink.findUnique({
    where: { userId },
    select: { userId: true },
  });

  return NextResponse.json({ linked: !!link });
}
