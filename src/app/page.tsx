import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // 👇 LOGIN (home)
    redirect("/login");
  }

  // 👇 já logado → manda pro admin por padrão
  redirect("/admin/calendar-konsist");
}
