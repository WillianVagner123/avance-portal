import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

/**
 * AUTH OPTIONS — AVANCE PORTAL
 *
 * O site agora abre direto, sem login e senha.
 * NextAuth permanece apenas para rotas antigas/integrações opcionais.
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

export const publicAppUser = {
  id: "public-master",
  email: "acesso-direto@avance.local",
  name: "Acesso Direto",
  role: "MASTER",
  status: "ACTIVE",
};

export const authOptions: NextAuthOptions = {
  providers,

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token }) {
      token.appUser = publicAppUser;
      return token;
    },

    async session({ session }) {
      session.user = {
        ...(session.user || {}),
        email: publicAppUser.email,
        name: publicAppUser.name,
      };
      session.appUser = publicAppUser as any;
      return session;
    },

    async redirect({ baseUrl }) {
      return `${baseUrl}/admin/calendar-konsist`;
    },
  },
};
