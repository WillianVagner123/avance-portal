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
  try {
    const session: any = await getServerSession(authOptions);
    const appUser = session?.appUser;

    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    if (!appUser || (appUser.status !== "ACTIVE" && appUser.role !== "MASTER")) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const role = appUser.role as string;
    const linkedProfessional = String(appUser.konsistMedicoNome || "").trim();
    if (role !== "MASTER" && !linkedProfessional) {
      // Profissional sem vínculo -> não pode ver agendamentos
      return NextResponse.json({ ok: false, error: "no_professional_link" }, { status: 403 });
    }

    const base = process.env.KONSIST_API_BASE || "";
    const endpoint = process.env.KONSIST_ENDPOINT_AGENDAMENTOS || "";
    const bearer = process.env.KONSIST_BEARER || "";

    const urlReq = new URL(req.url);
    const datai = urlReq.searchParams.get("datai") || fmtYYYYMMDD(new Date());
    const dataf = urlReq.searchParams.get("dataf") || fmtYYYYMMDD(new Date(Date.now() + 4 * 86400000));

    if (!base || !endpoint || !bearer) {
      return NextResponse.json(
        {
          ok: false,
          error: "ENV faltando",
          env: {
            KONSIST_API_BASE: !!base,
            KONSIST_ENDPOINT_AGENDAMENTOS: !!endpoint,
            KONSIST_BEARER: !!bearer,
          },
          range: { datai, dataf },
        },
        { status: 500 }
      );
    }

    const url = base.replace(/\/$/, "") + endpoint;
    const payload = { datai, dataf, idpaciente: 0, cpfPaciente: "" };

    console.log("[KONSIST] URL:", url);
    console.log("[KONSIST] PAYLOAD:", payload);

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

    console.log("[KONSIST] STATUS:", resp.status);
    console.log("[KONSIST] RAW(200):", raw.slice(0, 200));

    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Resposta do Konsist não é JSON", status: resp.status, raw: raw.slice(0, 2000) },
        { status: 502 }
      );
    }

    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: "Konsist retornou erro", status: resp.status, data: parsed },
        { status: resp.status }
      );
    }

    // ✅ filtra no servidor para PROFISSIONAL (evita vazar agenda de outros)
    if (role !== "MASTER") {
      const norm = (s: string) => s.trim().toLowerCase();
      const target = norm(linkedProfessional);

      const filterArr = (arr: any[]) =>
        arr.filter((it) => norm(String(it?.agendamento_medico || it?.profissional || "")) === target);

      if (Array.isArray(parsed?.Resultado)) {
        parsed.Resultado = filterArr(parsed.Resultado);
      } else if (Array.isArray(parsed?.resultado)) {
        parsed.resultado = filterArr(parsed.resultado);
      } else if (Array.isArray(parsed)) {
        parsed = filterArr(parsed);
      }
    }

    return NextResponse.json({ ok: true, range: { datai, dataf }, data: parsed });
  } catch (e: any) {
    console.error("[KONSIST] EXCEPTION:", e);
    // ✅ garante JSON até em erro inesperado
    return NextResponse.json(
      { ok: false, error: "Falha interna", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
