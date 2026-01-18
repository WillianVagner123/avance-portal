import "dotenv/config";
import { defineConfig } from "prisma/config";

<<<<<<< HEAD
// ✅ IMPORTANTE
// O build do Cloud Run (buildpack) roda "npm run build" sem suas env vars de runtime.
// Se o DATABASE_URL não existir no ambiente de build, a geração do Prisma pode falhar.
// Então usamos um fallback *válido* (não conecta de fato) apenas para gerar o client.
=======
>>>>>>> 4074369 (Cleanup + Prisma Postgres + fix build)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
<<<<<<< HEAD
  datasource: {
    url: DATABASE_URL,
  },
=======
  datasource: { url: DATABASE_URL },
>>>>>>> 4074369 (Cleanup + Prisma Postgres + fix build)
});
