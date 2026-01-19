export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// Não faça throw aqui: isso roda durante build/collect e derruba o deploy.
// Em runtime, se o secret faltar, o NextAuth já acusa (NO_SECRET).
const handler = NextAuth({
  ...authOptions,
  ...(secret ? { secret } : {}),
});

export { handler as GET, handler as POST };
