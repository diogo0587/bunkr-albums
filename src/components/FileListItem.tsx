import { motion } from 'framer-motion';
import { Copy, File, FileWarning, ExternalLink } from 'lucide-react';
import type { BunkrFile } from '@/types';
import { copyToClipboard } from '@/lib/utils';

interface FileListItemProps {
  file: BunkrFile;
  selected: boolean;
  onSelect: (id: string) => void;
  onCopy: (message: string) => void;
  index: number;
}

export function FileListItem({ file, selected, onSelect, onCopy, index }: FileListItemProps) {
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(file.url);
    onCopy(success ? 'URL copiada!' : 'Erro ao copiar');
  };

  const handleCopyName = async () => {
    const success = await copyToClipboard(file.name);
    onCopy(success ? 'Nome copiado!' : 'Erro ao copiar');
  };

  const handleOpen = () => {
    window.open(`/api/proxy?url=${encodeURIComponent(file.url)}`, '_blank', 'noopener,noreferrer');
  };

  const isDirectFile = file.isDirect !== false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/30 transition-colors group"
    >
      <label className="flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(file.id)}
          className="w-[18px] h-[18px] rounded border-2 border-slate-500 bg-slate-900 checked:bg-cyan-500 checked:border-cyan-500 text-white focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-0 cursor-pointer transition-colors"
        />
      </label>

      {isDirectFile ? (
        <File className="w-4 h-4 text-green-500 flex-shrink-0 hidden sm:block" />
      ) : (
        <FileWarning className="w-4 h-4 text-amber-500 flex-shrink-0 hidden sm:block" />
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-xs sm:text-sm font-mono text-slate-200 truncate cursor-pointer hover:text-cyan-400 transition-colors"
          onClick={handleCopyName}
          title={`${file.name}${isDirectFile ? '' : ' (clique para abrir página)'} (clique para copiar nome)`}
        >
          {file.name}
        </p>
        {!isDirectFile && (
          <p className="text-[10px] text-amber-500/70">Página do arquivo — abra para baixar</p>
        )}
      </div>

      <span className="text-[11px] sm:text-xs font-mono text-slate-400 flex-shrink-0 min-w-[60px] sm:min-w-[80px] text-right uppercase">
        {file.type || 'file'}
      </span>

      <button
        onClick={handleOpen}
        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Abrir URL"
      >
        <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      <button
        onClick={handleCopyUrl}
        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        title="Copiar URL"
      >
        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </motion.div>
  );
}
