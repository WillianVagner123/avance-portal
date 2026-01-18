"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handle() {
    try {
      setLoading(true);

      // Você pode trocar callbackUrl se quiser mandar direto p/ dashboard/admin
      await signIn("google", { callbackUrl: "/dashboard" });

      // Observação: normalmente o browser redireciona imediatamente
      // então não precisa setLoading(false) aqui.
    } catch (e) {
      setLoading(false);
      alert("Falha ao iniciar login com Google.");
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
