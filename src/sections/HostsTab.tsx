import { Globe, Check } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { HostCard } from '@/components/HostCard';
import {
  BUNKR_HOSTS,
  CURRENT_BUNKR_HOSTS,
  LEGACY_BUNKR_HOSTS,
  COMPATIBLE_BUNKR_HOSTS,
  BUNKR_INFRASTRUCTURE_HOSTS,
} from '@/lib/bunkr-hosts';
import { copyToClipboard } from '@/lib/utils';
import { useAppStore } from '@/hooks/useAppStore';

export function HostsTab() {
  const { showToast } = useAppStore();
  const [copiedAll, setCopiedAll] = useState(false);
  const groups = [
    { title: 'Atuais', description: 'Mirrors mantidos pelo extrator de referência', hosts: CURRENT_BUNKR_HOSTS },
    { title: 'Legados', description: 'Aceitos e redirecionados para o domínio atual', hosts: LEGACY_BUNKR_HOSTS },
    { title: 'Compatibilidade', description: 'Domínios históricos ainda reconhecidos', hosts: COMPATIBLE_BUNKR_HOSTS },
    { title: 'CDN e infraestrutura', description: 'Download, assinatura e armazenamento', hosts: BUNKR_INFRASTRUCTURE_HOSTS },
  ];

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

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.title}>
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-slate-300">{group.title}</h3>
              <p className="text-[10px] text-slate-500">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {group.hosts.map((hostname, index) => (
                <motion.div
                  key={hostname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.01, 0.15) }}
                >
                  <HostCard hostname={hostname} />
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
