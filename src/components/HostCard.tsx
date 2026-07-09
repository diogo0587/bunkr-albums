import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboard } from '@/lib/utils';

interface HostCardProps {
  hostname: string;
}

export function HostCard({ hostname }: HostCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(hostname);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-between w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-lg hover:border-cyan-500/50 hover:bg-slate-700/50 transition-all duration-150 group text-left"
    >
      <span className="font-mono text-xs sm:text-sm text-cyan-400 truncate">
        {hostname}
      </span>
      {copied ? (
        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0 ml-2" />
      ) : (
        <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 group-hover:text-cyan-400 flex-shrink-0 ml-2 transition-colors" />
      )}
    </button>
  );
}
