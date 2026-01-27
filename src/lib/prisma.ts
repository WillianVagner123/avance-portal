import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const prisma =
  global.__prisma ??
  (() => {
    const pool =
      global.__pgPool ??
      new Pool({
        connectionString: mustEnv("DATABASE_URL"),
        ssl: { rejectUnauthorized: false },
        max: 1,
      });

    global.__pgPool = pool;

    return new PrismaClient({
      adapter: new PrismaPg(pool),
      log: ["error", "warn"],
    });
  })();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
