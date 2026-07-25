import { useCallback, useMemo } from 'react';
import { Layers, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { ProgressBar } from '@/components/ProgressBar';
import { useAppStore, getEffectiveProxyUrl } from '@/hooks/useAppStore';
import { validateBunkrUrl, fetchAlbumHtml, parseAlbumHtml, resolveFileUrl } from '@/lib/bunkr-parser';
import type { BatchResult } from '@/types';

export function BatchTab() {
  const store = useAppStore();
  const { batch: state } = store;
  const proxy = getEffectiveProxyUrl(store);

  const urls = useMemo(() => {
    return state.urls
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);
  }, [state.urls]);

  const handleProcess = useCallback(async () => {
    if (urls.length === 0) {
      store.showToast({ type: 'error', message: 'Insira pelo menos uma URL' });
      return;
    }

    const results: BatchResult[] = urls.map(url => ({
      url,
      status: 'pending' as const,
      fileCount: 0,
    }));
    store.btSetResults(results);
    store.btSetProcessing(true);
    store.btSetProgress(0, urls.length);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      store.btSetProgress(i + 1, urls.length);
      store.btUpdateResult(i, { url, status: 'loading', fileCount: 0 });

      const validation = validateBunkrUrl(url);
      if (!validation.valid) {
        store.btUpdateResult(i, { url, status: 'error', fileCount: 0, error: validation.error });
        continue;
      }

      try {
        const html = await fetchAlbumHtml(url, proxy);
        const result = parseAlbumHtml(html, url);

        if (result.files.length === 0) {
          store.btUpdateResult(i, { url, status: 'error', fileCount: 0, error: 'Nenhum arquivo encontrado' });
        } else {
          // Resolve first file to get download URL
          const firstResolved = await resolveFileUrl(result.files[0].url, proxy);
          store.btUpdateResult(i, {
            url,
            status: 'success',
            fileCount: result.files.length,
          });
          store.saveDownload(url, result.files, result.albumName);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        store.btUpdateResult(i, { url, status: 'error', fileCount: 0, error: message });
      }

      if (i < urls.length - 1) {
        await new Promise(r => setTimeout(r, store.downloadDelay || 1000));
      }
    }

    store.btSetProcessing(false);
    const successCount = results.filter(r => r.status === 'success').length;
    store.showToast({
      type: 'success',
      message: `${successCount}/${urls.length} álbuns processados`,
    });
  }, [urls, proxy, store]);

  const successCount = useMemo(() => state.results.filter(r => r.status === 'success').length, [state.results]);
  const errorCount = useMemo(() => state.results.filter(r => r.status === 'error').length, [state.results]);

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 sm:p-4 space-y-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">
            URLs de álbuns Bunkr (uma por linha)
          </label>
          <textarea
            value={state.urls}
            onChange={(e) => store.btSetUrls(e.target.value)}
            placeholder={'https://bunkr.cr/a/abc123\nhttps://bunkr.cr/a/def456\nhttps://bunkr.cr/a/ghi789'}
            rows={5}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-mono resize-none min-h-[44px]"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            {urls.length} URL{urls.length !== 1 ? 's' : ''} detectada{urls.length !== 1 ? 's' : ''}
          </p>
        </div>

        <GradientButton
          onClick={handleProcess}
          loading={state.processing}
          disabled={urls.length === 0}
          className="w-full"
        >
          Processar Lote ({urls.length})
        </GradientButton>
      </div>

      {/* Progress */}
      {state.processing && (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span className="text-xs sm:text-sm text-slate-300">
              Processando {state.progress.current}/{state.progress.total}
            </span>
          </div>
          <ProgressBar current={state.progress.current} total={state.progress.total} />
        </div>
      )}

      {/* Summary */}
      {state.results.length > 0 && !state.processing && (
        <div className="flex gap-3">
          <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-400">{successCount}</p>
            <p className="text-[10px] text-green-400/70">Sucesso</p>
          </div>
          <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-red-400">{errorCount}</p>
            <p className="text-[10px] text-red-400/70">Erros</p>
          </div>
        </div>
      )}

      {/* Results */}
      {state.results.length > 0 && (
        <div className="bg-slate-800 border border-slate-600 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto scrollbar-thin">
            {state.results.map((result, index) => (
              <motion.div
                key={result.url}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 px-3 sm:px-4 py-3"
              >
                <div className="flex-shrink-0">
                  {result.status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  {result.status === 'success' && <Check className="w-4 h-4 text-green-400" />}
                  {result.status === 'error' && <X className="w-4 h-4 text-red-400" />}
                  {result.status === 'pending' && <div className="w-4 h-4 rounded-full border border-slate-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate font-mono">{result.url}</p>
                  {result.error && <p className="text-[10px] text-red-400 truncate">{result.error}</p>}
                  {result.status === 'success' && (
                    <p className="text-[10px] text-green-400">{result.fileCount} arquivos</p>
                  )}
                </div>
                {result.status === 'success' && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {state.results.length === 0 && (
        <div className="flex flex-col items-center py-12 sm:py-16 text-slate-600">
          <Layers className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
          <p className="text-sm sm:text-base text-slate-500 text-center px-4">
            Cole múltiplas URLs de álbuns Bunkr acima
          </p>
          <p className="text-xs text-slate-600 mt-2 text-center max-w-md">
            Processe vários álbuns de uma vez — cada um será listado e resolvido automaticamente
          </p>
        </div>
      )}
    </div>
  );
}
