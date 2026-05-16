import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function PendingPage() {
  redirect("/admin/calendar-konsist");
}
