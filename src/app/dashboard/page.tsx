import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const session: any = await getServerSession(authOptions);

  if (!session?.user?.email) redirect("/login");

  const appUser = session?.appUser;

  if (!appUser) redirect("/pending");
  if (appUser?.status !== "ACTIVE") redirect("/pending");

  if (appUser?.role === "MASTER" || appUser?.role === "ADMIN") {
    redirect("/admin/calendar-konsist");
  }

  redirect("/professional/calendar");
}
