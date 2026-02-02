import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/getPrisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

/**
 * AUTH OPTIONS — AVANCE PORTAL
 * - JWT session
 * - Prisma user hydration
 * - appUser disponível na session
 * - redirect direto para calendário
 */

export const authOptions: NextAuthOptions = {
  providers: [
    // 🔹 Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // 🔹 Login com email + senha
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const prisma = getPrisma();

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) return null;

        // 🔹 Retorno mínimo (JWT será enriquecido depois)
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],

  // 🔐 Sessão via JWT
  session: {
    strategy: "jwt",
  },

  callbacks: {
    /**
     * JWT CALLBACK
     * Executa:
     * - no login
     * - em cada request autenticado
     */
    async jwt({ token }) {
      if (!token?.email) return token;

      const prisma = getPrisma();

      const user = await prisma.user.findUnique({
        where: { email: token.email },
      });

      if (user) {
        token.appUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      }

      return token;
    },

    /**
     * SESSION CALLBACK
     * Exponibiliza appUser no frontend
     */
    async session({ session, token }) {
      session.appUser = token.appUser as any;
      return session;
    },

    /**
     * REDIRECT CALLBACK
     * Sempre cai direto no calendário
     */
    async redirect({ baseUrl }) {
      return `${baseUrl}/calendar`;
    },
  },

  // 🔹 Página customizada de login
  pages: {
    signIn: "/login",
  },
};
