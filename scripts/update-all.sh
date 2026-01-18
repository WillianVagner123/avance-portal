#!/usr/bin/env bash
set -Eeuo pipefail

step () { echo ""; echo "==> $1"; }
die () { echo ""; echo "❌ ERRO: $1"; exit 1; }
trap 'echo ""; echo "❌ Falhou na linha $LINENO"; exit 1' ERR

step "[0] Checando que estamos na raiz do projeto"
[ -f package.json ] || die "Rode na raiz do projeto (onde tem package.json)."

step "[1] Instalar Google APIs"
npm i googleapis || true

step "[2] Criar pastas"
mkdir -p src/app/settings/calendar/picker
mkdir -p src/app/admin/calendar-links
mkdir -p src/app/api/google/calendars
mkdir -p src/app/api/google/select-calendar
mkdir -p src/app/api/admin/calendar-links/approve
mkdir -p src/app/api/admin/calendar-links/deny
mkdir -p src/lib

step "[3] Atualizar Prisma schema (adicionar models se faltarem)"
SCHEMA="prisma/schema.prisma"
[ -f "$SCHEMA" ] || die "Nao achei $SCHEMA"

if ! grep -q "model GoogleCalendarLink" "$SCHEMA"; then
cat >> "$SCHEMA" <<'EOF'

model GoogleCalendarLink {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id])

  calendarId    String?
  calendarName  String?

  approved     Boolean  @default(false)
  approvedBy   String?
  approvedAt   DateTime?

  accessToken  String?
  refreshToken String?
  expiryDate   DateTime?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model KonsistProfessionalMap {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  user                    User     @relation(fields: [userId], references: [id])

  konsistProfissionalNome String
  konsistProfissionalId   String?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
fi

step "[4] Rodar migrate + generate"
npx prisma migrate dev -n add_google_calendar_link
npx prisma generate

step "[5] Criar src/lib/auth.ts + atualizar NextAuth route"
cat > src/lib/auth.ts <<'EOF'
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
        },
      },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile?.email || "").toLowerCase();
      const name = (profile as any)?.name || null;
      if (!email) return false;

      const masterEmail = (process.env.MASTER_EMAIL || "").toLowerCase();

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            status: email === masterEmail ? "ACTIVE" : "PENDING",
            role: email === masterEmail ? "MASTER" : "PROFESSIONAL",
          },
        });

        if (email !== masterEmail) {
          await prisma.accessRequest.create({
            data: { email, name, status: "PENDING", userId: user.id },
          });
        }
      }

      if (email !== masterEmail) {
        const pending = await prisma.accessRequest.findFirst({
          where: { email, status: "PENDING" },
        });

        if (!pending && user.status === "PENDING") {
          await prisma.accessRequest.create({
            data: { email, name, status: "PENDING", userId: user.id },
          });
        }
      }

      return true;
    },

    async jwt({ token, account }) {
      if (account?.provider === "google" && account.access_token) {
        const email = (token.email || "").toString().toLowerCase();
        if (email) {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            await prisma.googleCalendarLink.upsert({
              where: { userId: user.id },
              create: {
                userId: user.id,
                accessToken: account.access_token || null,
                refreshToken: (account.refresh_token as any) || null,
                expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
                approved: false,
              },
              update: {
                accessToken: account.access_token || null,
                refreshToken: (account.refresh_token as any) || undefined,
                expiryDate: account.expires_at ? new Date(account.expires_at * 1000) : null,
              },
            });
          }
        }
      }
      return token;
    },

    async session({ session }) {
      const email = (session.user?.email || "").toLowerCase();
      if (!email) return session;

      const user = await prisma.user.findUnique({ where: { email } });
      const link = user
        ? await prisma.googleCalendarLink.findUnique({ where: { userId: user.id } }).catch(() => null)
        : null;

      (session as any).appUser = user
        ? {
            id: user.id,
            status: user.status,
            role: user.role,
            konsistMedicoNome: user.konsistMedicoNome,
            googleCalendar: link
              ? {
                  approved: link.approved,
                  calendarId: link.calendarId,
                  calendarName: link.calendarName,
                  hasRefreshToken: !!link.refreshToken,
                }
              : null,
          }
        : { status: "PENDING", role: "PROFESSIONAL" };

      return session;
    },
  },
};
cat > "src/app/api/auth/[...nextauth]/route.ts" <<'EOF'
export const runtime = "nodejs";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
step "[6] APIs Google"
cat > src/app/api/google/calendars/route.ts <<'EOF'
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (appUser?.status !== "ACTIVE" && appUser?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const link = await prisma.googleCalendarLink.findUnique({ where: { userId: appUser.id } });
  if (!link?.accessToken) return NextResponse.json({ error: "Sem token do Google (reauthorize)" }, { status: 400 });

  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!);
  oauth2.setCredentials({ access_token: link.accessToken, refresh_token: link.refreshToken || undefined });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  const list = await cal.calendarList.list();

  const calendars = (list.data.items || []).map((c) => ({
    id: c.id!,
    summary: c.summary || c.id!,
    primary: !!c.primary,
    accessRole: c.accessRole,
  }));

  return NextResponse.json({
    calendars,
    selected: { id: link.calendarId, name: link.calendarName },
    approved: link.approved,
  });
}
cat > src/app/api/google/select-calendar/route.ts <<'EOF'
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (appUser?.status !== "ACTIVE" && appUser?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fd = await req.formData();
  const calendarId = String(fd.get("calendarId") || "");
  const calendarName = String(fd.get("calendarName") || "");

  if (!calendarId) return NextResponse.json({ error: "Missing calendarId" }, { status: 400 });

  await prisma.googleCalendarLink.upsert({
    where: { userId: appUser.id },
    create: { userId: appUser.id, calendarId, calendarName, approved: false },
    update: { calendarId, calendarName, approved: false },
  });

  return NextResponse.redirect(new URL("/settings/calendar", req.url));
}
step "[7] Páginas profissional"
mkdir -p src/app/settings/calendar
cat > src/app/settings/calendar/page.tsx <<'EOF'
export const runtime = "nodejs";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SettingsCalendarPage() {
  const session = await getServerSession(authOptions);
  const appUser = (session as any)?.appUser;

  if (!session?.user?.email) redirect("/login");

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Vincular Google Calendar</h1>

      <div style={{ opacity: 0.85, marginBottom: 16 }}>
        Email: <b>{session.user.email}</b>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Status</div>
        {!appUser?.googleCalendar ? (
          <div style={{ opacity: 0.8 }}>Ainda sem vínculo. Clique em “Reautorizar Google”.</div>
        ) : (
          <div style={{ opacity: 0.85 }}>
            Refresh token: {appUser.googleCalendar.hasRefreshToken ? "✅" : "⚠️ ainda não (reauthorize)"}<br />
            Agenda: {appUser.googleCalendar.calendarName || "-"} ({appUser.googleCalendar.calendarId || "-"})<br />
            Aprovação do admin: {appUser.googleCalendar.approved ? "✅ Aprovado" : "⏳ Pendente"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <a
          href="/api/auth/signin/google"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Reautorizar Google (Calendar)
        </a>
        <a
          href="/settings/calendar/picker"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Escolher agenda
        </a>
      </div>

      <p style={{ opacity: 0.85 }}>
        Depois de escolher a agenda, o admin precisa aprovar o vínculo (email ↔ profissional do Konsist).
      </p>
    </div>
  );
}
cat > src/app/settings/calendar/picker/page.tsx <<'EOF'
export const runtime = "nodejs";
import PickerClient from "./ui";
export default function PickerPage() { return <PickerClient />; }
cat > src/app/settings/calendar/picker/ui.tsx <<'EOF'
"use client";
import { useEffect, useState } from "react";

type Cal = { id: string; summary: string; primary: boolean; accessRole?: string };

export default function PickerClient() {
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState<Cal[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/google/calendars", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Falha ao carregar");
        setCalendars(j.calendars || []);
        setSelectedId(j.selected?.id || "");
        setApproved(!!j.approved);
      } catch (e: any) {
        alert(e?.message || "Erro");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;

  const selectedName = calendars.find((c) => c.id === selectedId)?.summary || "";

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 10 }}>Selecione sua agenda</h1>

      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Aprovação do admin: {approved ? "✅ Aprovado" : "⏳ Pendente"}
      </div>

      <form
        method="post"
        action="/api/google/select-calendar"
        style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}
      >
        <select
          name="calendarId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: 10, borderRadius: 10, minWidth: 360 }}
        >
          <option value="">-- Escolha --</option>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.primary ? "⭐ " : ""}
              {c.summary} ({c.accessRole})
            </option>
          ))}
        </select>

        <input type="hidden" name="calendarName" value={selectedName} />
        <button type="submit" style={{ padding: "10px 12px", borderRadius: 10 }}>
          Salvar
        </button>
        <a
          href="/settings/calendar"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}
        >
          Voltar
        </a>
      </form>
    </div>
  );
}
step "[8] Admin calendar-links + approve/deny APIs"
mkdir -p src/app/admin/calendar-links
cat > src/app/admin/calendar-links/page.tsx <<'EOF'
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export default async function AdminCalendarLinksPage() {
  const links = await prisma.googleCalendarLink.findMany({
    include: { user: true },
    orderBy: { updatedAt: "desc" },
  });

  const maps = await prisma.konsistProfessionalMap.findMany();
  const mapByUserId = new Map(maps.map((m) => [m.userId, m]));

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Autorizar vínculo (Email ↔ Profissional)</h1>
      <p style={{ opacity: 0.85, marginBottom: 14 }}>
        O profissional escolhe a agenda dele. Aqui o MASTER valida e aprova o vínculo com o nome do profissional no Konsist.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {links.map((l) => {
          const m = mapByUserId.get(l.userId);
          return (
            <div
              key={l.id}
              style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}
            >
              <div style={{ fontWeight: 700 }}>{l.user.email}</div>
              <div style={{ opacity: 0.85, marginTop: 6 }}>
                Agenda: {l.calendarName || "-"} ({l.calendarId || "-"})<br />
                Refresh token: {l.refreshToken ? "✅" : "⚠️ (reauthorize)"}<br />
                Profissional (Konsist): {m?.konsistProfissionalNome || "-"}<br />
                Aprovado: {l.approved ? "✅ SIM" : "⏳ NÃO"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <form
                  method="post"
                  action="/api/admin/calendar-links/approve"
                  style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                >
                  <input type="hidden" name="userId" value={l.userId} />
                  <input
                    name="konsistProfissionalNome"
                    placeholder="Nome EXATO do profissional no Konsist"
                    defaultValue={m?.konsistProfissionalNome || ""}
                    style={{ padding: 8, borderRadius: 10, minWidth: 340 }}
                  />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Aprovar
                  </button>
                </form>

                <form method="post" action="/api/admin/calendar-links/deny">
                  <input type="hidden" name="userId" value={l.userId} />
                  <button type="submit" style={{ padding: "8px 12px", borderRadius: 10 }}>
                    Revogar
                  </button>
                </form>
              </div>

              <div style={{ opacity: 0.7, marginTop: 10 }}>atualizado: {new Date(l.updatedAt).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
cat > src/app/api/admin/calendar-links/approve/route.ts <<'EOF'
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.appUser?.role;
  const actorEmail = (session?.user?.email || "").toLowerCase();

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fd = await req.formData();
  const userId = String(fd.get("userId") || "");
  const konsistProfissionalNome = String(fd.get("konsistProfissionalNome") || "").trim();

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  if (!konsistProfissionalNome) return NextResponse.json({ error: "Missing konsistProfissionalNome" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    await tx.konsistProfessionalMap.upsert({
      where: { userId },
      create: { userId, konsistProfissionalNome },
      update: { konsistProfissionalNome },
    });

    await tx.googleCalendarLink.update({
      where: { userId },
      data: { approved: true, approvedBy: actorEmail, approvedAt: new Date() },
    });
  });

  return NextResponse.redirect(new URL("/admin/calendar-links", req.url));
}
cat > src/app/api/admin/calendar-links/deny/route.ts <<'EOF'
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.appUser?.role;
  const actorEmail = (session?.user?.email || "").toLowerCase();

  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fd = await req.formData();
  const userId = String(fd.get("userId") || "");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await prisma.googleCalendarLink.update({
    where: { userId },
    data: { approved: false, approvedBy: actorEmail, approvedAt: new Date() },
  });

  return NextResponse.redirect(new URL("/admin/calendar-links", req.url));
}
echo ""
echo "✅ OK: atualizado."
echo "Agora rode: npm run dev"
