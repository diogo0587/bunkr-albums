import { Clock, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { HistoryItem } from '@/components/HistoryItem';
import { useAppStore } from '@/hooks/useAppStore';

export function HistoryTab() {
  const { history, clearHistory, showToast } = useAppStore();

  const handleClear = () => {
    clearHistory();
    showToast({ type: 'success', message: 'Histórico limpo' });
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-600">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-semibold text-slate-200">
            Histórico de URLs
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar Histórico</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin">
        {history.length > 0 ? (
          history.map((entry, index) => (
            <motion.div
              key={`${entry.url}-${entry.timestamp}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <HistoryItem
                entry={entry}
                onCopy={(msg) => showToast({ type: 'success', message: msg })}
              />
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center py-12 sm:py-16 text-slate-600">
            <Clock className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
            <p className="text-sm sm:text-base text-slate-500 text-center px-4">
              Nenhuma URL processada ainda
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
