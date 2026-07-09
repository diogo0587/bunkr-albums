import { useMemo, useState } from 'react';
import { Layers, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { ProgressBar } from '@/components/ProgressBar';
import { BatchResultItem } from '@/components/BatchResultItem';
import { useBatchState } from '@/hooks/useBatchState';
import { useAppStore, getEffectiveProxyUrl } from '@/hooks/useAppStore';
import { validateBunkrUrl, fetchAlbumHtml, parseAlbumHtml, resolveAlbumFiles } from '@/lib/bunkr-parser';
import type { BunkrFile } from '@/types';

interface BatchFileResult {
  url: string;
  files: BunkrFile[];
  albumName: string;
}

export function BatchTab() {
  const {
    state,
    setUrls,
    setProcessing,
    setResults,
    updateResult,
    setProgress,
    reset,
  } = useBatchState();

  const store = useAppStore();
  const proxy = getEffectiveProxyUrl(store);

  const [batchFiles, setBatchFiles] = useState<BatchFileResult[]>([]);

  const urlList = useMemo(() => {
    return state.urls
      .split('\n')
      .map(u => u.trim())
      .filter(Boolean);
  }, [state.urls]);

  const handleProcess = async () => {
    if (urlList.length === 0) {
      store.showToast({ type: 'info', message: 'Insira pelo menos uma URL' });
      return;
    }

    const invalidUrls = urlList.filter(url => !validateBunkrUrl(url).valid);
    if (invalidUrls.length > 0) {
      store.showToast({ type: 'error', message: `${invalidUrls.length} URL(s) inválida(s) encontradas` });
      return;
    }

    setProcessing(true);
    setBatchFiles([]);
    const initialResults: import('@/types').BatchResult[] = urlList.map(url => ({
      url,
      status: 'pending',
      fileCount: 0,
    }));
    setResults(initialResults);
    setProgress(0, urlList.length);

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      updateResult(i, { url, status: 'loading', fileCount: 0 });

      try {
        await new Promise(r => setTimeout(r, store.downloadDelay));
        
        // Resolve album files (parse + resolve each file URL)
        const resolvedFiles = await resolveAlbumFiles(url, proxy);

        const albumHtml = await fetchAlbumHtml(url, proxy);
        const parsed = parseAlbumHtml(albumHtml, url);

        if (resolvedFiles.length === 0) {
          updateResult(i, {
            url,
            status: 'error',
            fileCount: 0,
            error: 'Nenhum arquivo encontrado',
          });
        } else {
          updateResult(i, {
            url,
            status: 'success',
            fileCount: resolvedFiles.length,
          });
          setBatchFiles(prev => [...prev, { url, files: resolvedFiles, albumName: parsed.albumName }]);
          store.addHistory({
            url,
            timestamp: Date.now(),
            fileCount: resolvedFiles.length,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        updateResult(i, {
          url,
          status: 'error',
          fileCount: 0,
          error: message,
        });
      }

      setProgress(i + 1, urlList.length);
    }

    setProcessing(false);
    const successCount = state.results.filter(r => r.status === 'success').length;
    store.showToast({ type: 'success', message: `Processamento concluído: ${successCount}/${urlList.length} com sucesso` });
  };

  const successCount = state.results.filter(r => r.status === 'success').length;
  const errorCount = state.results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4">
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400">
          URLs de Álbuns (uma por linha)
        </label>
        
        <textarea
          value={state.urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={`https://bunkr.sk/a/xxxxx\nhttps://bunkr.sk/a/yyyyy\nhttps://bunkr.sk/a/zzzzz`}
          className="w-full min-h-[150px] sm:min-h-[200px] max-h-[300px] sm:max-h-[400px] px-3 sm:px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all resize-y"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <GradientButton
            onClick={handleProcess}
            loading={state.processing}
            disabled={state.urls.trim().length === 0 || urlList.length === 0}
            className="flex-1"
          >
            Processar Lote ({urlList.length} URLs)
          </GradientButton>
          
          {state.results.length > 0 && !state.processing && (
            <button
              onClick={() => { reset(); setBatchFiles([]); }}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors min-h-[44px]"
            >
              Limpar
            </button>
          )}
        </div>

        {urlList.length > 10 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Muitas URLs podem demorar. Delay de {store.downloadDelay}ms + resolução de cada arquivo.
          </p>
        )}

        {proxy && (
          <p className="text-[11px] text-slate-500">
            Proxy ativo: {proxy.substring(0, 40)}...
          </p>
        )}
      </div>

      {/* Progress */}
      <AnimatePresence>
        {(state.processing || (state.results.length > 0 && !state.processing)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4"
          >
            {state.processing && (
              <div>
                <p className="text-sm text-slate-300 mb-2">
                  Processando {state.progress.current} de {state.progress.total} URLs...
                </p>
                <ProgressBar
                  current={state.progress.current}
                  total={state.progress.total}
                />
              </div>
            )}

            {!state.processing && state.results.length > 0 && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-green-400">{successCount} sucesso</span>
                <span className="text-slate-600">|</span>
                <span className="text-red-400">{errorCount} erro(s)</span>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto scrollbar-thin">
              {state.results.map((result, index) => (
                <BatchResultItem key={`${result.url}-${index}`} result={result} />
              ))}
            </div>

            {/* Show resolved files for each album */}
            {batchFiles.length > 0 && !state.processing && (
              <div className="border-t border-slate-700 pt-4 space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">Arquivos Resolvidos</h3>
                {batchFiles.map((bf, idx) => (
                  <div key={idx} className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs font-mono text-cyan-400 truncate mb-2">{bf.url}</p>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {bf.files.filter(f => f.isDirect).map((file, fidx) => (
                        <div key={fidx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 truncate flex-1">{file.name}</span>
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = file.url;
                              a.download = file.name;
                              a.target = '_blank';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="ml-2 px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded hover:bg-cyan-600/30 transition-colors"
                          >
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {state.results.length === 0 && !state.processing && (
        <div className="flex flex-col items-center py-12 sm:py-16 text-slate-600">
          <Layers className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
          <p className="text-sm sm:text-base text-slate-500 text-center px-4">
            Insira múltiplas URLs de álbuns para processar em lote
          </p>
        </div>
      )}
    </div>
  );
}
