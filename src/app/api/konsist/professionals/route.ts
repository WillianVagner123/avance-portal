export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function fmtYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions);
  const appUser = session?.appUser;

  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!appUser || (appUser.status !== "ACTIVE" && appUser.role !== "MASTER")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const base = process.env.KONSIST_API_BASE || "";
  const endpoint = process.env.KONSIST_ENDPOINT_AGENDAMENTOS || "";
  const bearer = process.env.KONSIST_BEARER || "";
  if (!base || !endpoint || !bearer) {
    return NextResponse.json({ ok: false, error: "ENV faltando" }, { status: 500 });
  }

  const urlReq = new URL(req.url);
  const datai = urlReq.searchParams.get("datai") || fmtYYYYMMDD(new Date());
  const dataf = urlReq.searchParams.get("dataf") || fmtYYYYMMDD(new Date(Date.now() + 7 * 86400000));

  const url = base.replace(/\/$/, "") + endpoint;
  const payload = { datai, dataf, idpaciente: 0, cpfPaciente: "" };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await resp.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Resposta do Konsist não é JSON" }, { status: 502 });
  }

  if (!resp.ok) {
    return NextResponse.json({ ok: false, error: "Konsist retornou erro", status: resp.status, data: parsed }, { status: resp.status });
  }

  const items = Array.isArray(parsed?.Resultado)
    ? parsed.Resultado
    : Array.isArray(parsed?.resultado)
    ? parsed.resultado
    : Array.isArray(parsed)
    ? parsed
    : [];

  const set = new Set<string>();
  for (const it of items) {
    const name = String(it?.agendamento_medico || it?.profissional || "").trim();
    if (name) set.add(name);
  }

  const professionals = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return NextResponse.json({ ok: true, range: { datai, dataf }, professionals });
}
