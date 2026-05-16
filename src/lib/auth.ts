import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { findStaticUserByEmail } from "@/lib/staticUsers";

/**
 * AUTH OPTIONS — AVANCE PORTAL
 * - JWT session
 * - Login por email + senha sem depender de banco/Supabase
 * - Usuários lidos de variáveis de ambiente/Secrets do deploy
 * - appUser disponível na session
 */

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Senha", type: "password" },
    },

    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;

      const user = findStaticUserByEmail(credentials.email);
      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!valid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      const email = (user?.email || token.email || "").toString().toLowerCase();
      if (!email) return token;

      const appUser = findStaticUserByEmail(email);

      if (appUser) {
        token.appUser = {
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
          role: appUser.role,
          status: appUser.status,
        };
      }

      return token;
    },

    async session({ session, token }) {
      session.appUser = token.appUser as any;
      return session;
    },

    async redirect({ baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: "/login",
  },
};
