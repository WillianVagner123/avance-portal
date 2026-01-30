import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/getPrisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";


export const authOptions: NextAuthOptions = {
  providers: [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
  console.log("CREDENTIALS:", credentials);

  if (!credentials?.email || !credentials.password) {
    console.log("❌ Missing credentials");
    return null;
  }

  const prisma = getPrisma();

  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase() },
  });

  console.log("USER FROM DB:", user);

  if (!user || !user.password) {
    console.log("❌ User not found or no password");
    return null;
  }

  const valid = await bcrypt.compare(credentials.password, user.password);
  console.log("PASSWORD MATCH:", valid);

  if (!valid) {
    console.log("❌ Invalid password");
    return null;
  }

  console.log("✅ AUTHORIZED");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}


  }),
],


  session: { strategy: "jwt" },

callbacks: {
  async jwt({ token }) {
    if (!token.email) return token;

    const prisma = getPrisma();

    const dbUser = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!dbUser) return token;

    token.appUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      status: dbUser.status,
    };

    return token;
  },

  async session({ session, token }) {
    session.appUser = token.appUser;
    return session;
  },
},



  pages: {
    signIn: "/login",
  },
};
