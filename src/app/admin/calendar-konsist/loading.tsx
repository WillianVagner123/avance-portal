export default function LoadingAdminCalendar() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <div className="text-lg font-black">Carregando agenda…</div>
        <div className="mt-2 text-sm text-slate-400">Inicializando calendário e preparando dados.</div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-950/60 border border-white/10">
          <div className="h-full w-1/2 bg-blue-600 animate-pulse" />
        </div>

        <div className="mt-3 text-xs text-slate-500">
          (Depois que abrir, você verá o progresso real por blocos no topo.)
        </div>
      </div>
    </main>
  );
}
