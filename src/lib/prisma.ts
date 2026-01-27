import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const pool =
      globalForPrisma.pgPool ??
      new Pool({
        connectionString: mustEnv("DATABASE_URL"),
      });

    globalForPrisma.pgPool = pool;

    return new PrismaClient({
      adapter: new PrismaPg(pool),
      log: ["error", "warn"],
    });
  })();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
