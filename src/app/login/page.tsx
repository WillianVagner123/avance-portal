"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * LoginPage renders a credentials based login form. Users enter their email
 * and password and the form uses NextAuth to attempt a sign in via the
 * "credentials" provider. Accounts are now managed through environment
 * variables/Secrets instead of a database-backed registration flow.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const deriveError = () => {
    if (errorMsg) return errorMsg;
    if (urlError === "CredentialsSignin") {
      return "Credenciais inválidas. Verifique seu email e senha.";
    }
    if (urlError === "AccessDenied") {
      return "Acesso negado.";
    }
    return null;
  };
  const shownError = deriveError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setErrorMsg("Credenciais inválidas. Verifique seu email e senha.");
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1631248055158-edec7a3c072b?q=80&w=1161&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/90" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-semibold text-white">Clínica Avance</h1>
          <p className="mt-1 text-sm text-zinc-300">Portal interno de profissionais</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {shownError ? (
            <div className="text-red-400 text-sm text-center">
              {shownError}
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-white/30 bg-transparent px-3 py-2 text-sm text-white placeholder-white/50 focus:border-white/50 focus:outline-none"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-white/30 bg-transparent px-3 py-2 text-sm text-white placeholder-white/50 focus:border-white/50 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white text-zinc-900 px-4 py-3 text-sm font-medium hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-center text-xs text-zinc-400">
            Acesso liberado apenas para usuários cadastrados pelo administrador.
          </p>
        </form>
      </div>
    </main>
  );
}
