import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // evita múltiplas instâncias em dev / Cloud Run
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

export const getPrisma = () => {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      adapter,
    });
  }

  return global.prisma;
};
