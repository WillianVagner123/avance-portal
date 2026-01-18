"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Fundo com imagem */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1631248055158-edec7a3c072b?q=80&w=1161&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold">
            A
          </div>

          <h1 className="text-2xl font-semibold text-white">Clínica Avance</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Portal interno de profissionais
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="w-full rounded-xl bg-white text-zinc-900 px-4 py-3 text-sm font-medium hover:bg-zinc-200 transition"
          >
            Entrar com Google
          </button>

          <p className="text-center text-xs text-zinc-400">
            Acesso restrito a profissionais autorizados
          </p>
        </div>
      </div>
    </main>
  );
}