export default function RegisterPage() {
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
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl p-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white">
          A
        </div>
        <h1 className="text-2xl font-semibold text-white">Cadastro desativado</h1>
        <p className="mt-3 text-sm text-zinc-300">
          As contas são cadastradas pelo administrador nas variáveis de ambiente do deploy.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block rounded-xl bg-white text-zinc-900 px-4 py-3 text-sm font-medium hover:bg-zinc-200 transition"
        >
          Voltar para o login
        </a>
      </div>
    </main>
  );
}
