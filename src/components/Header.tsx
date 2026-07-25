import { DownloadCloud, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
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
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-[10px] text-slate-500 font-mono mr-1">1-6</span>
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
          v2.1
        </span>
      </div>
    </header>
  );
}
