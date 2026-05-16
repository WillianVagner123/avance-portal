import NextAuth from "next-auth";

type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  status?: string;
};

declare module "next-auth" {
  interface Session {
    appUser?: AppUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUser?: AppUser;
  }
}
