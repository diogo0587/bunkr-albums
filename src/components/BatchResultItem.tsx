import { CheckCircle, XCircle, Loader2, FileArchive } from 'lucide-react';
import type { BatchResult } from '@/types';

interface BatchResultItemProps {
  result: BatchResult;
}

const statusIcons = {
  success: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />,
  error: <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />,
  loading: <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-spin flex-shrink-0" />,
  pending: <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />,
};

const statusBg = {
  success: 'border-green-500/30 bg-green-500/5',
  error: 'border-red-500/30 bg-red-500/5',
  loading: 'border-cyan-500/30 bg-cyan-500/5',
  pending: 'border-slate-700 bg-slate-800',
};

export function BatchResultItem({ result }: BatchResultItemProps) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border rounded-lg ${statusBg[result.status]}`}>
      {statusIcons[result.status]}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-mono text-slate-300 truncate" title={result.url}>
          {result.url}
        </p>
        {result.error && (
          <p className="text-[11px] sm:text-xs text-red-400 mt-0.5">{result.error}</p>
        )}
      </div>
      {result.status === 'success' && (
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          <FileArchive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>{result.fileCount}</span>
        </div>
      )}
    </div>
  );
}
