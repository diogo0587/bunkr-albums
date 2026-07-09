import { Globe, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { HostCard } from '@/components/HostCard';
import { BUNKR_HOSTS } from '@/lib/bunkr-hosts';
import { copyToClipboard } from '@/lib/utils';
import { useAppStore } from '@/hooks/useAppStore';

export function HostsTab() {
  const { showToast } = useAppStore();
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAll = async () => {
    const allHosts = BUNKR_HOSTS.join('\n');
    const success = await copyToClipboard(allHosts);
    if (success) {
      setCopiedAll(true);
      showToast({ type: 'success', message: 'Todos os hosts copiados!' });
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-semibold text-slate-200">
            Domínios Suportados
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">
            {BUNKR_HOSTS.length}+ hosts
          </span>
        </div>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
        >
          {copiedAll ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Globe className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">Copiar Todos</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {BUNKR_HOSTS.map((hostname, index) => (
          <motion.div
            key={hostname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.01 }}
          >
            <HostCard hostname={hostname} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
