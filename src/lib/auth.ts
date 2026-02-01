import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/getPrisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions, Account } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    // =========================
    // LOGIN COM EMAIL / SENHA
    // =========================
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const prisma = getPrisma();
<<<<<<< HEAD

=======
>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) return null;

<<<<<<< HEAD
        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

=======
        const valid = await bcrypt.compare(credentials.password, user.password);
>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),

    // =========================
    // LOGIN COM GOOGLE
    // =========================
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
<<<<<<< HEAD

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // =========================
    // JWT CALLBACK
    // =========================
    async jwt({ token, account }) {
      const prisma = getPrisma();

      // Login com Google → salvar tokens
      if (account && account.provider === "google") {
        const googleAccount = account as Account;

        token.accessToken = googleAccount.access_token;
        token.refreshToken = googleAccount.refresh_token;
        token.expiresAt = googleAccount.expires_at
          ? new Date(googleAccount.expires_at * 1000)
          : null;
      }

      // Sempre buscar usuário completo no banco
      if (token.email) {
        const user = await prisma.user.findUnique({
          where: { email: token.email.toLowerCase() },
          include: { googleCalendarLink: true },
        });

        if (user) {
          token.appUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            konsistMedicoNome: user.konsistMedicoNome,
            googleCalendarLink: user.googleCalendarLink
              ? {
                  approved: user.googleCalendarLink.approved,
                  calendarId: user.googleCalendarLink.calendarId,
                  calendarName: user.googleCalendarLink.calendarName,
                  hasRefreshToken: !!user.googleCalendarLink.refreshToken,
                }
              : null,
          };
        }
      }

      return token;
    },

    // =========================
    // SESSION CALLBACK
    // =========================
    async session({ session, token }) {
      if (token.appUser) {
        (session as any).appUser = token.appUser;
        (session as any).calendarAuthorized =
          !!token.appUser.googleCalendarLink?.approved;
      } else {
        (session as any).calendarAuthorized = false;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
=======
  callbacks: {
  async jwt({ token, user }) {
    // Quando o usuário loga pela primeira vez, guardamos o ID dele no Token
    if (user) {
      token.id = user.id;
    }
    return token;
  },
  async session({ session, token }) {
    const prisma = getPrisma();
    // Buscamos os dados atualizados do banco usando o ID fixo
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
    });

    if (dbUser) {
      (session as any).appUser = dbUser;
    }
    return session;
  },
}, // Chave de fechamento dos callbacks
  session: { strategy: "jwt" },
}; // Chave de fechamento das authOptions

>>>>>>> 0cbbd32 (fix: prisma client type and api routes)
