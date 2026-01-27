import type { NextAuthOptions } from "next-auth";
import { prisma } from "./prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Configure credentials‑based authentication.  Users can log in with
  // their email and password stored in the User model.  Passwords are
  // hashed using bcryptjs.  The authorize callback verifies the
  // provided credentials and returns a basic user object on success.
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").toString().toLowerCase().trim();
        const password = (credentials?.password || "").toString();
        if (!email || !password) return null;
        // Look up the user by email.  Only users who have set a password can
        // sign in with credentials.
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;
        // Return the minimal user object required by NextAuth.
        return { id: user.id, email: user.email, name: user.name || undefined } as any;
      },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // When signing in with credentials, the `user` parameter will be
      // available.  Save the userId on the token so it persists across
      // requests.  For existing sessions we use the email stored on the
      // token to look up the user and augment the token with role and
      // status information.
      const email = (token.email || "").toString().toLowerCase();
      if (user?.id) {
        (token as any).userId = user.id;
      }
      if (email) {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          (token as any).role = dbUser.role;
          (token as any).status = dbUser.status;
          (token as any).userId = dbUser.id;
        }
      }
      return token;
    },

    async session({ session }) {
      const email = (session.user?.email || "").toString().toLowerCase();
      if (!email) return session;
      const user = await prisma.user.findUnique({ where: { email } });
      const link = user
        ? await prisma.googleCalendarLink
            .findUnique({ where: { userId: user.id } })
            .catch(() => null)
        : null;
      const lastProfessionalReq = user
        ? await prisma.professionalLinkRequest
            .findFirst({
              where: { userId: user.id },
              orderBy: { createdAt: "desc" },
            })
            .catch(() => null)
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
