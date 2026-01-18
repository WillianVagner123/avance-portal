import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email || "").toLowerCase();
      const name = (profile as any)?.name || null;
      if (!email) return false;

      const masterEmail = (process.env.MASTER_EMAIL || "").toLowerCase();

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            status: email === masterEmail ? "ACTIVE" : "PENDING",
            role: email === masterEmail ? "MASTER" : "PROFESSIONAL",
          },
        });

        if (email !== masterEmail) {
          await prisma.accessRequest.create({
            data: { email, name, status: "PENDING", userId: user.id },
          });
        }
      } else {
        if (email === masterEmail && (user.role !== "MASTER" || user.status !== "ACTIVE")) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: "MASTER", status: "ACTIVE" },
          });
        }
      }

      if (email !== masterEmail) {
        const pending = await prisma.accessRequest.findFirst({
          where: { email, status: "PENDING" },
        });

        if (!pending && user.status === "PENDING") {
          await prisma.accessRequest.create({
            data: { email, name, status: "PENDING", userId: user.id },
          });
        }
      }

      return true;
    },

    async jwt({ token }) {
      const email = (token.email || "").toString().toLowerCase();
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          (token as any).userId = user.id;
          (token as any).role = user.role;
          (token as any).status = user.status;
        }
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).appUser = {
        id: (token as any).userId || null,
        role: (token as any).role || "PROFESSIONAL",
        status: (token as any).status || "PENDING",
      };
      return session;
    },
  },
};
