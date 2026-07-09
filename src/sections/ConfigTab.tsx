import { useState } from 'react';
import { Info, AlertTriangle, Lightbulb, Check, Shield, Zap, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { useAppStore, PROXY_PROVIDERS } from '@/hooks/useAppStore';
import type { ProxyProvider } from '@/hooks/useAppStore';

export function ConfigTab() {
  const {
    proxyEnabled,
    setProxyEnabled,
    proxyProvider,
    setProxyProvider,
    proxyUrl,
    setProxyUrl,
    downloadDelay,
    setDownloadDelay,
    history,
    clearHistory,
    savedDownloads,
    clearSavedDownloads,
    showToast,
  } = useAppStore();

  const [proxyCopied, setProxyCopied] = useState(false);

  const handleCopyProxy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setProxyCopied(true);
      setTimeout(() => setProxyCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const currentProxyUrl = PROXY_PROVIDERS[proxyProvider]?.url || proxyUrl;

  const providersList = Object.entries(PROXY_PROVIDERS) as [ProxyProvider, { label: string; url: string }][];

  const savedCount = Object.keys(savedDownloads).length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Proxy Section */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-200">Proxy CORS</h2>
          </div>
          <Switch
            checked={proxyEnabled}
            onCheckedChange={setProxyEnabled}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        <p className="text-xs text-slate-500">
          O proxy CORS é <strong>essencial</strong> para baixar arquivos. Escolha um provedor abaixo. 
          Se um falhar, tente outro.
        </p>

        <AnimatePresence>
          {proxyEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-3"
            >
              {/* Provider selection */}
              <div className="space-y-2">
                {providersList.map(([key, provider]) => (
                  <div
                    key={key}
                    onClick={() => setProxyProvider(key)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      proxyProvider === key
                        ? 'border-cyan-500/50 bg-cyan-500/5'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">{provider.label}</p>
                        {provider.url && (
                          <code className="text-[10px] text-slate-500 font-mono truncate block">
                            {provider.url}
                          </code>
                        )}
                      </div>
                    </div>
                    {proxyProvider === key && (
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Custom proxy input */}
              {proxyProvider === 'custom' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    placeholder="https://meu-proxy.com/?url="
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-500">
                    O proxy deve aceitar a URL como parâmetro. Exemplo: https://proxy.com/?url=URL
                  </p>
                </motion.div>
              )}

              {/* Copy current proxy */}
              <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg">
                <code className="text-xs font-mono text-cyan-400 flex-1 truncate">
                  {currentProxyUrl || 'Nenhum proxy configurado'}
                </code>
                {currentProxyUrl && (
                  <button
                    onClick={() => handleCopyProxy(currentProxyUrl)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors flex-shrink-0"
                  >
                    {proxyCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </div>

              <p className="flex items-start gap-1.5 text-xs text-amber-400">
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Proxies gratuitos podem ter limites. Se um falhar, troque para outro provedor acima.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Download Settings */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-semibold text-slate-200">Download</h2>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-slate-300">Delay entre downloads (ms)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="5000"
              step="100"
              value={downloadDelay}
              onChange={(e) => setDownloadDelay(Number(e.target.value))}
              className="flex-1 accent-cyan-500"
            />
            <input
              type="number"
              value={downloadDelay}
              onChange={(e) => setDownloadDelay(Number(e.target.value))}
              min="0"
              max="10000"
              className="w-20 sm:w-24 px-2 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm font-mono text-slate-200 text-center focus:border-cyan-500 outline-none"
            />
          </div>
          <p className="text-xs text-slate-500">
            Delay maior evita bloqueio de taxa pelo proxy. Padrão: 1500ms.
          </p>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Dados Armazenados</h2>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
            <div>
              <p className="text-sm text-slate-300">Histórico de URLs</p>
              <p className="text-xs text-slate-500">{history.length} entradas (máx. 20)</p>
            </div>
            <button
              onClick={() => { clearHistory(); showToast({ type: 'success', message: 'Histórico limpo' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
            <div>
              <p className="text-sm text-slate-300">Downloads salvos</p>
              <p className="text-xs text-slate-500">{savedCount} álbuns persistidos</p>
            </div>
            <button
              onClick={() => { clearSavedDownloads(); showToast({ type: 'success', message: 'Downloads salvos limpos' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-2">
        <p className="text-sm text-slate-400">BunkrDownloader Pro v2.1</p>
        <p className="text-xs text-slate-500">
          Com integração balbums.st, 40+ domínios suportados, busca integrada e múltiplos proxies CORS.
        </p>
      </div>

      {/* Tips */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-300">Dicas de Uso</h3>
        </div>
        <ul className="space-y-2">
          {[
            'Use a aba Buscar para encontrar álbuns no balbums.st (600k+ álbuns)',
            'Clique "Extrair" em um álbum para ir direto à aba Download',
            'Mantenha o Proxy CORS ativo — teste provedores diferentes se um falhar',
            'O delay padrão de 1500ms evita bloqueio de taxa',
            'Arquivos com ícone verde têm URL resolvida pronta para download',
            'Seus downloads são salvos automaticamente (persistência local)',
            'O histórico mantém as últimas 20 URLs processadas',
          ].map((tip, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-400">
              <Info className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
