export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) redirect("/login");

  if (appUser?.role === "MASTER") redirect("/admin");
  if (appUser?.status === "ACTIVE") redirect("/dashboard");
  redirect("/pending");
}
