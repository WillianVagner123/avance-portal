import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    appUser?: {
      id: string;
      email: string;
      name?: string | null;
      role: "MASTER" | "PROFESSIONAL";
      status?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    appUser?: {
      id: string;
      email: string;
      name?: string | null;
      role: "MASTER" | "PROFESSIONAL";
      status?: string;
    };
  }
}
