import { DownloadCloud } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-800 border-b border-slate-600">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500">
          <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <h1 className="text-base sm:text-xl font-bold text-slate-50 tracking-tight">
          BunkrDownloader Pro
        </h1>
      </div>
      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
        v2.0
      </span>
    </header>
  );
}
