import { Copy, ExternalLink, FileArchive } from 'lucide-react';
import type { HistoryEntry } from '@/types';
import { copyToClipboard, formatDate } from '@/lib/utils';

interface HistoryItemProps {
  entry: HistoryEntry;
  onCopy: (message: string) => void;
}

export function HistoryItem({ entry, onCopy }: HistoryItemProps) {
  const handleCopy = async () => {
    const success = await copyToClipboard(entry.url);
    onCopy(success ? 'URL copiada!' : 'Erro ao copiar');
  };

  const handleOpen = () => {
    window.open(entry.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/20 transition-colors group">
      <div className="flex-1 min-w-0">
        <p
          className="text-xs sm:text-sm font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer truncate"
          onClick={handleCopy}
          title={`${entry.url} (clique para copiar)`}
        >
          {entry.url}
        </p>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
          {formatDate(entry.timestamp)}
        </p>
      </div>

      <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
        <FileArchive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="hidden sm:inline">{entry.fileCount} arquivos</span>
        <span className="sm:hidden">{entry.fileCount}</span>
      </div>

      <button
        onClick={handleOpen}
        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Abrir URL"
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      <button
        onClick={handleCopy}
        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Copiar URL"
      >
        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
