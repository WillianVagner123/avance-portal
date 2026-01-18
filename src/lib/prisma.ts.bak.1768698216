import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getSqliteUrl() {
  // Padrão recomendado: file:./prisma/dev.db
  const url = process.env.DATABASE_URL || "file:./prisma/dev.db";

  // Se alguém deixou "prisma/dev.db" sem "file:", corrige automaticamente
  if (!url.startsWith("file:")) return `file:${url.startsWith("./") ? url : `./${url}`}`;

  return url;
}

function makeClient() {
  const adapter = new PrismaBetterSqlite3({
    url: getSqliteUrl(),
  });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
