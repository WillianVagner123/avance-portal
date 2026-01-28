import { PrismaClient } from "@prisma/client";

declare global {
  // evita múltiplas instâncias em dev
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export async function getPrisma() {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ["error", "warn"],
    });
  }
  return global.prisma;
}
