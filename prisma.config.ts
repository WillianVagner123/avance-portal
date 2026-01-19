// prisma.config.ts
import { defineConfig } from "prisma/config";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: mustEnv("DATABASE_URL"),
  },
});
