export const runtime = "nodejs";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secret) {
  throw new Error("Missing AUTH_SECRET / NEXTAUTH_SECRET in production");
}

const handler = NextAuth({
  ...authOptions,
  secret,
});

export { handler as GET, handler as POST };
