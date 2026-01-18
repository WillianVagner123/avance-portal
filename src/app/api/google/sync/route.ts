import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = req.headers.get("x-sync-secret");
  if (secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 🔒 STUB SEGURO
  // Aqui depois vamos:
  // - usar refresh_token
  // - buscar eventos no Google Calendar
  // - atualizar o banco
  console.log("[google-sync] job executado");

  return NextResponse.json({ ok: true });
}
