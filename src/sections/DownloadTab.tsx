import { useMemo, useCallback, useState, useEffect } from 'react';
import { FolderOpen, Search, Loader2, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { ProgressBar } from '@/components/ProgressBar';
import { FileListItem } from '@/components/FileListItem';
import { useDownloadState } from '@/hooks/useDownloadState';
import { useAppStore, getEffectiveProxyUrl } from '@/hooks/useAppStore';
import { validateBunkrUrl, fetchAlbumHtml, parseAlbumHtml, filterFiles, resolveFileUrl } from '@/lib/bunkr-parser';
import { copyToClipboard } from '@/lib/utils';

export function DownloadTab() {
  const {
    state,
    setUrl,
    setLoading,
    setFiles,
    setError,
    toggleFile,
    selectAll,
    deselectAll,
    setIncludeFilter,
    setExcludeFilter,
    setDownloading,
    setDownloadProgress,
  } = useDownloadState();

  const store = useAppStore();
  const proxy = getEffectiveProxyUrl(store);

  const [resolveProgress, setResolveProgress] = useState({ current: 0, total: 0, filename: '' });
  const [resolving, setResolving] = useState(false);

  // Check for pending URL from SearchTab
  useEffect(() => {
    if (store.pendingUrl) {
      const url = store.pendingUrl;
      store.setPendingUrl(''); // Clear it
      setUrl(url);
      // Auto-fetch after a short delay to allow render
      setTimeout(() => {
        handleFetch(url);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = useCallback((msg: string) => {
    store.showToast({ type: 'success', message: msg });
  }, [store]);

  const filteredFiles = useMemo(() => {
    return filterFiles(state.files, state.includeFilter, state.excludeFilter);
  }, [state.files, state.includeFilter, state.excludeFilter]);

  const directFiles = useMemo(() => {
    return filteredFiles.filter(f => f.isDirect !== false);
  }, [filteredFiles]);

  const selectedDirectFiles = useMemo(() => {
    return directFiles.filter(f => state.selectedFiles.has(f.id));
  }, [directFiles, state.selectedFiles]);

  const handleFetch = async (overrideUrl?: string) => {
    const urlToFetch = overrideUrl || state.urlInput;
    
    const validation = validateBunkrUrl(urlToFetch);
    if (!validation.valid) {
      setError(validation.error || 'URL inválida');
      store.showToast({ type: 'error', message: validation.error || 'URL inválida' });
      return;
    }

    if (overrideUrl) setUrl(overrideUrl);
    setLoading(true);
    setResolving(false);

    try {
      // Step 1: Fetch album page
      const html = await fetchAlbumHtml(urlToFetch, proxy);
      const result = parseAlbumHtml(html, urlToFetch);

      if (result.files.length === 0) {
        setError('Nenhum arquivo encontrado no álbum');
        store.showToast({ type: 'error', message: 'Nenhum arquivo encontrado no álbum' });
        return;
      }

      // Set initial files (page URLs, not resolved yet)
      setFiles(result.files, result.albumName);
      
      // Step 2: Resolve each file URL through Bunkr's API
      setResolving(true);
      setResolveProgress({ current: 0, total: result.files.length, filename: '' });

      const resolvedFiles = [...result.files];
      
      for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        setResolveProgress({ current: i + 1, total: result.files.length, filename: file.name });
        
        const resolved = await resolveFileUrl(file.url, proxy);
        if (resolved) {
          resolvedFiles[i] = {
            ...file,
            name: resolved.filename,
            url: resolved.url,
            type: getFileExtension(resolved.filename),
            isDirect: true,
          };
          // Update files in real-time
          setFiles(resolvedFiles.slice(0, i + 1).concat(result.files.slice(i + 1)), result.albumName);
        }
        
        // Delay between resolutions to avoid rate limiting
        if (i < result.files.length - 1) {
          await new Promise(r => setTimeout(r, 600));
        }
      }

      const resolvedCount = resolvedFiles.filter(f => f.isDirect).length;
      
      // Save to persisted downloads
      store.saveDownload(urlToFetch, resolvedFiles, result.albumName);
      
      store.addHistory({
        url: urlToFetch,
        timestamp: Date.now(),
        fileCount: result.files.length,
      });
      store.showToast({ 
        type: 'success', 
        message: `${result.files.length} arquivos encontrados, ${resolvedCount} resolvidos` 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar álbum';
      setError(message);
      store.showToast({ type: 'error', message });
    } finally {
      setLoading(false);
      setResolving(false);
    }
  };

  const handleDownloadSelected = async () => {
    const filesToDownload = selectedDirectFiles;
    if (filesToDownload.length === 0) {
      store.showToast({ type: 'info', message: 'Selecione arquivos com URL direta (ícone verde)' });
      return;
    }

    setDownloading(true);
    setDownloadProgress(0, filesToDownload.length);

    for (let i = 0; i < filesToDownload.length; i++) {
      const file = filesToDownload[i];
      store.showToast({ type: 'info', message: `Baixando ${i + 1}/${filesToDownload.length}: ${file.name}` });

      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadProgress(i + 1, filesToDownload.length);

      if (i < filesToDownload.length - 1) {
        await new Promise(r => setTimeout(r, store.downloadDelay));
      }
    }

    setDownloading(false);
    store.showToast({ type: 'success', message: `${filesToDownload.length} downloads iniciados!` });
  };

  const handleCopyAllUrls = async () => {
    const selectedFiles = filteredFiles.filter(f => state.selectedFiles.has(f.id));
    if (selectedFiles.length === 0) return;
    const urls = selectedFiles.map(f => f.url).join('\n');
    const success = await copyToClipboard(urls);
    store.showToast({ type: success ? 'success' : 'error', message: success ? 'URLs copiadas!' : 'Erro ao copiar' });
  };

  const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => state.selectedFiles.has(f.id));
  const nonDirectCount = filteredFiles.filter(f => f.isDirect === false).length;

  return (
    <div className="space-y-4">
      {/* URL Input Card */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6">
        <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
          URL do Álbum Bunkr
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            value={state.urlInput}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            placeholder="https://bunkr.sk/a/xxxxx"
            className="flex-1 px-3 sm:px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[44px]"
          />
          <GradientButton
            onClick={() => handleFetch()}
            loading={state.loading || resolving}
            disabled={!state.urlInput.trim()}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            {resolving ? 'Resolvendo...' : 'Listar'}
          </GradientButton>
        </div>

        <AnimatePresence>
          {state.error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-xs sm:text-sm text-red-400 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>

        {proxy && (
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Proxy: {proxy.substring(0, 40)}...
          </p>
        )}
      </div>

      {/* Resolving Progress */}
      <AnimatePresence>
        {resolving && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-slate-800/80 border border-cyan-500/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <p className="text-sm text-cyan-400">
                Resolvendo URLs dos arquivos... {resolveProgress.current}/{resolveProgress.total}
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-2 truncate">
              {resolveProgress.filename}
            </p>
            <ProgressBar current={resolveProgress.current} total={resolveProgress.total} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Card */}
      {state.files.length > 0 && !resolving && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-800 border border-slate-600 rounded-xl"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-semibold text-slate-200">
                Arquivos Encontrados
              </h2>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400">
                {filteredFiles.length}
              </span>
              {nonDirectCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400">
                  {nonDirectCount} não resolvido{nonDirectCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={allSelected ? deselectAll : selectAll}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {allSelected ? 'Desselecionar Tudo' : 'Selecionar Tudo'}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-3 sm:px-4 py-2 border-b border-slate-600/50 bg-slate-800/50">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">URL resolvida (download direto)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">Não resolvido</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4 border-b border-slate-600/50">
            <div className="flex-1">
              <input
                type="text"
                value={state.includeFilter}
                onChange={(e) => setIncludeFilter(e.target.value)}
                placeholder="Incluir: .mp4, .jpg ou nome"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[40px]"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={state.excludeFilter}
                onChange={(e) => setExcludeFilter(e.target.value)}
                placeholder="Ignorar: .txt, .html ou nome"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[40px]"
              />
            </div>
          </div>

          {/* File List */}
          <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto scrollbar-thin">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file, index) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  selected={state.selectedFiles.has(file.id)}
                  onSelect={toggleFile}
                  onCopy={handleCopy}
                  index={index}
                />
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-slate-500">
                <Search className="w-8 h-8 mb-2" />
                <p className="text-sm">Nenhum arquivo corresponde aos filtros</p>
              </div>
            )}
          </div>

          {/* Download Area */}
          {filteredFiles.length > 0 && (
            <div className="p-3 sm:p-4 border-t border-slate-600 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <GradientButton
                  onClick={handleDownloadSelected}
                  loading={state.downloading}
                  disabled={selectedDirectFiles.length === 0}
                  className="flex-1"
                >
                  Download ({selectedDirectFiles.length})
                </GradientButton>
                <button
                  onClick={handleCopyAllUrls}
                  disabled={filteredFiles.filter(f => state.selectedFiles.has(f.id)).length === 0}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  Copiar URLs
                </button>
              </div>

              {state.downloading && (
                <ProgressBar
                  current={state.downloadProgress.current}
                  total={state.downloadProgress.total}
                />
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {state.files.length === 0 && !state.loading && !resolving && (
        <div className="flex flex-col items-center py-12 sm:py-16 text-slate-600">
          <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
          <p className="text-sm sm:text-base text-slate-500 text-center px-4">
            Cole uma URL de álbum Bunkr acima e clique em Listar
          </p>
          <p className="text-xs text-slate-600 mt-2 text-center max-w-md">
            Ou use a aba <strong>Buscar</strong> para encontrar álbuns no balbums.st
          </p>
        </div>
      )}
    </div>
  );
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : '';
}
