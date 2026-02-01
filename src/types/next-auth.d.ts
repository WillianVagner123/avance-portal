import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

export type AppUser = {
  id: string;
  email: string;
  role: "MASTER" | "PROFESSIONAL";
  status: "ACTIVE" | "PENDING" | "BLOCKED";
};

declare module "next-auth" {
  interface Session extends DefaultSession {
    appUser?: AppUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    appUser?: AppUser;
  }
}
