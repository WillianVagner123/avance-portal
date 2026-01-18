const { execSync } = require("child_process");

const db = process.env.DATABASE_URL || "file:./dev.db";
console.log("postinstall: prisma generate (DATABASE_URL =", db, ")");

execSync("npx prisma generate", {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: db },
});
