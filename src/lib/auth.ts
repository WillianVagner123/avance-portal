import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/getPrisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions, Account } from "next-auth";


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

<<<<<<< HEAD
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
=======
  callbacks: {
    /**
     * Persist additional information in the JWT. This callback runs on
     * every sign in and subsequent request. When a user authenticates via
     * Google we capture the access token, refresh token and expiry date
     * from the `account` object and persist them both in the JWT and in
     * our database via the GoogleCalendarLink model. We also attach the
     * full user (including their calendar link) to `token.appUser` so that
     * it can be accessed in the session callback and middleware.
     */
    async jwt({ token, account }): Promise<any> {
      const prisma = getPrisma();
      // If the user just signed in with Google, persist OAuth tokens
      if (account && (account as Account).provider === "google") {
        const googleAccount = account as Account;
        token.accessToken = googleAccount.access_token;
        token.refreshToken = (googleAccount.refresh_token as any) ?? undefined;
        token.expiresAt = googleAccount.expires_at
          ? new Date(googleAccount.expires_at * 1000)
          : undefined;

        // Persist tokens in our GoogleCalendarLink table. We need the
        // associated user in order to upsert the row. We derive the email
        // from the token (which is present on first sign in).
        const email = (token.email || "").toString().toLowerCase();
        if (email) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            await prisma.googleCalendarLink.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                accessToken: googleAccount.access_token || null,
                refreshToken: (googleAccount.refresh_token as any) || null,
                expiryDate: googleAccount.expires_at
                  ? new Date(googleAccount.expires_at * 1000)
                  : null,
                approved: false,
              },
              update: {
                accessToken: googleAccount.access_token || null,
                refreshToken: (googleAccount.refresh_token as any) || undefined,
                expiryDate: googleAccount.expires_at
                  ? new Date(googleAccount.expires_at * 1000)
                  : null,
              },
            });
          }
        }
      }

      // Always attach the latest user record (including calendar link) to the token
      if (token?.email) {
        const email = (token.email || "").toString().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { googleCalendarLink: true },
        });
        if (user) {
          token.appUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            status: user.status,
            role: user.role,
            konsistMedicoNome: user.konsistMedicoNome,
            googleCalendarLink: user.googleCalendarLink
              ? {
                  approved: user.googleCalendarLink.approved,
                  calendarId: user.googleCalendarLink.calendarId,
                  calendarName: user.googleCalendarLink.calendarName,
                  hasRefreshToken: !!user.googleCalendarLink.refreshToken,
                }
              : null,
          } as any;
        }
      }
      return token;
    },

    /**
     * Expose our custom user object on the session. In addition to the
     * default `session.user` object provided by NextAuth we append
     * `appUser` which contains role, status and calendar information.
     */
    async session({ session, token }) {
      // Carry through default user properties
      if (token?.appUser) {
        (session as any).appUser = token.appUser;
      }
      // Surface whether the calendar is approved so the front‑end can react
      if (token?.appUser?.googleCalendarLink) {
        (session as any).calendarAuthorized = token.appUser.googleCalendarLink.approved;
      } else {
        (session as any).calendarAuthorized = false;
      }
      return session;
    },
>>>>>>> 2bdcad6 (novo)
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
