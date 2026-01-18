"use client";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ padding: 18, width: "min(520px, 92vw)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.35)" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Sair</div>
        <div style={{ opacity: 0.8, marginBottom: 14 }}>Clique para encerrar a sessão e entrar novamente.</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", cursor: "pointer" }}
        >
          Sair agora
        </button>
      </div>
    </div>
  );
}
