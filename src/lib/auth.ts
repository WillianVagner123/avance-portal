import type { NextAuthOptions } from "next-auth";
import { prisma } from "./prisma";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
// ✅ aqui (config do NextAuth)
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
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
        const pending = await prisma.accessRequest.findFirst({ where: { email, status: "PENDING" } });
        if (!pending && user.status === "PENDING") {
          await prisma.accessRequest.create({ data: { email, name, status: "PENDING", userId: user.id } });
        }
      }

      return true;
    },

    async jwt({ token, account }) {
      const email = (token.email || "").toString().toLowerCase();

      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          (token as any).role = user.role;
          (token as any).status = user.status;
          (token as any).userId = user.id;
        }
      }

      if (account?.provider === "google" && account.access_token && email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.googleCalendarLink.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              accessToken: account.access_token || null,
              refreshToken: (account.refresh_token as any) || null,
              expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
              approved: false,
            },
            update: {
              accessToken: account.access_token || null,
              refreshToken: (account.refresh_token as any) || undefined,
              expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
            },
          });
        }
      }

      return token;
    },

    async session({ session }) {
      const email = (session.user?.email || "").toLowerCase();
      if (!email) return session;

      const user = await prisma.user.findUnique({ where: { email } });
      const link = user
        ? await prisma.googleCalendarLink.findUnique({ where: { userId: user.id } }).catch(() => null)
        : null;

      const lastProfessionalReq = user
        ? await prisma.professionalLinkRequest.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
          }).catch(() => null)
        : null;

      (session as any).appUser = user
        ? {
            id: user.id,
            status: user.status,
            role: user.role,
            konsistMedicoNome: user.konsistMedicoNome,
            professionalLinkRequest: lastProfessionalReq
              ? {
                  status: lastProfessionalReq.status,
                  requestedProfessional: lastProfessionalReq.requestedProfessional,
                  approvedProfessional: lastProfessionalReq.approvedProfessional,
                  createdAt: lastProfessionalReq.createdAt,
                }
              : null,
            googleCalendar: link
              ? {
                  approved: link.approved,
                  calendarId: link.calendarId,
                  calendarName: link.calendarName,
                  hasRefreshToken: !!link.refreshToken,
                }
              : null,
          }
        : { status: "PENDING", role: "PROFESSIONAL" };

      return session;
    },
  },
};
