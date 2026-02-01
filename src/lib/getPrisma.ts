import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
<<<<<<< HEAD
  // evita múltiplas instâncias em dev / Cloud Run
=======
>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);

<<<<<<< HEAD
export const getPrisma = () => {
=======
  return new PrismaClient({
    adapter,
  });
}

// ✅ Explicitamos que o retorno é SEMPRE PrismaClient para o build passar
export function getPrisma(): PrismaClient {
>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      adapter,
    });
  }

<<<<<<< HEAD
  return global.prisma;
};
=======
  return global.prisma!;
}
>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
