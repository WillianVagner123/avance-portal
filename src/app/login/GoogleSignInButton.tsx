"use client";

import React, { useState } from "react";
// This component previously started a NextAuth sign‑in with Google.  After
// migrating to credentials based authentication we no longer use
// NextAuth's Google provider for login.  Instead we redirect the user
// to our custom OAuth2 initiation endpoint which links their Google
// calendar.  This component is unused in the current login page but
// remains for potential future use (e.g. linking from other areas of
// the app).

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handle() {
    try {
      setLoading(true);
      // Redirect to our Google authorization route.  This triggers the
      // OAuth2 flow for calendar linking.  It does not log the user
      // into the application.
      window.location.href = "/api/google/authorize";
    } catch (e) {
      setLoading(false);
      alert("Falha ao iniciar autorização com o Google.");
    }
  }

  return (
    <>
      <button
        onClick={handle}
        disabled={loading}
        className="w-full rounded-xl bg-white text-zinc-900 font-semibold py-3 hover:bg-zinc-100 disabled:opacity-70"
      >
        {loading ? "Abrindo Google..." : "Entrar com Google"}
      </button>

      {loading && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-[320px] rounded-2xl bg-white/10 border border-white/20 p-5 text-center text-white shadow-2xl">
            <div className="mx-auto h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
            <div className="mt-4 text-lg font-bold">Conectando…</div>
            <div className="mt-1 text-sm text-white/70">
              Você será redirecionado para o Google.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
