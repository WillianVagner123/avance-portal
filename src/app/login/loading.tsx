export default function LoadingLogin() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 w-[360px] text-center">
        <div className="text-sm font-extrabold text-slate-300">Carregando…</div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-white/30" />
        </div>
      </div>
    </main>
  );
}
