export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl w-[360px]">
        <h1 className="text-xl font-black mb-4">Avance Portal</h1>

        <a
          href="/api/auth/signin"
          className="block text-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 font-extrabold text-white"
        >
          Entrar
        </a>
      </div>
    </div>
  );
}
