import { triggerDownload } from '@/lib/capacitor-native';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { FolderOpen, Search, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { ProgressBar } from '@/components/ProgressBar';
import { FileListItem } from '@/components/FileListItem';
import { useAppStore, getEffectiveProxyUrl } from '@/hooks/useAppStore';
import { validateBunkrUrl, fetchAlbumHtml, parseAlbumHtml, filterFiles, resolveFileUrl } from '@/lib/bunkr-parser';
import { copyToClipboard } from '@/lib/utils';
import type { BunkrFile } from '@/types';

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : '';
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return decodeURIComponent(parts[parts.length - 1]) || 'file';
  } catch {
    return 'file';
  }
}

export function DownloadTab() {
  const store = useAppStore();
  const { download: state } = store;
  const proxy = getEffectiveProxyUrl(store);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (store.pendingUrl) {
      const url = store.pendingUrl;
      store.setPendingUrl('');
      store.dlSetUrl(url);
      setTimeout(() => handleFetch(url), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData('text/plain');
    if (text && text.trim()) {
      const urls = text.trim().split('\n').map(u => u.trim()).filter(Boolean);
      if (urls.length === 1) {
        store.dlSetUrl(urls[0]);
        handleFetch(urls[0]);
      } else {
        store.dlSetUrl(urls.join('\n'));
        store.showToast({ type: 'info', message: `${urls.length} URLs coladas — cole na aba Lote para processar` });
      }
    }
  }, [store]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && text.includes('')) {
      const urls = text.trim().split('\n').map(u => u.trim()).filter(Boolean);
      if (urls.length > 1) {
        e.preventDefault();
        store.dlSetUrl(urls[0]);
        store.showToast({ type: 'info', message: 'Múltiplas URLs detectadas — use a aba Lote' });
      }
    }
  }, [store]);

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
    const sel = new Set(state.selectedFiles);
    return directFiles.filter(f => sel.has(f.id));
  }, [directFiles, state.selectedFiles]);

  const handleFetch = async (overrideUrl?: string) => {
    const urlToFetch = overrideUrl || state.urlInput;

    const validation = validateBunkrUrl(urlToFetch);
    if (!validation.valid) {
      store.dlSetError(validation.error || 'URL inválida');
      store.showToast({ type: 'error', message: validation.error || 'URL inválida' });
      return;
    }

    if (overrideUrl) store.dlSetUrl(overrideUrl);
    store.dlSetLoading(true);
    store.dlSetResolving(false);

    // ── Direct file URL (CDN link) ──
    if (validation.isDirect) {
      const name = filenameFromUrl(urlToFetch);
      const directFile: BunkrFile = {
        id: `direct-${Date.now()}`,
        name,
        url: urlToFetch,
        size: '-',
        type: getFileExtension(name),
        isDirect: true,
      };
      store.dlSetFiles([directFile], name);
      store.showToast({ type: 'success', message: 'Link direto detectado — pronto para download' });
      return;
    }

    // ── Album URL — fetch and resolve ──
    try {
      const html = await fetchAlbumHtml(urlToFetch, proxy);
      const result = parseAlbumHtml(html, urlToFetch);

      if (result.files.length === 0) {
        store.dlSetError('Nenhum arquivo encontrado no álbum');
        store.showToast({ type: 'error', message: 'Nenhum arquivo encontrado no álbum' });
        return;
      }

      store.dlSetFiles(result.files, result.albumName);
      store.dlSetResolving(true);
      store.dlSetResolveProgress(0, result.files.length, '');

      const resolvedFiles = [...result.files];

      for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
        store.dlSetResolveProgress(i + 1, result.files.length, file.name);

        const resolved = await resolveFileUrl(file.url, proxy);
        if (resolved) {
          resolvedFiles[i] = {
            ...file,
            name: resolved.filename,
            url: resolved.url,
            type: getFileExtension(resolved.filename),
            isDirect: true,
          };
          store.dlSetFiles(resolvedFiles.slice(0, i + 1).concat(result.files.slice(i + 1)), result.albumName);
        }

        if (i < result.files.length - 1) {
          await new Promise(r => setTimeout(r, store.downloadDelay || 600));
        }
      }

      const resolvedCount = resolvedFiles.filter(f => f.isDirect).length;
      store.saveDownload(urlToFetch, resolvedFiles, result.albumName);
      store.addHistory({ url: urlToFetch, timestamp: Date.now(), fileCount: result.files.length });
      store.showToast({
        type: 'success',
        message: `${result.files.length} arquivos encontrados, ${resolvedCount} resolvidos`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar álbum';
      store.dlSetError(message);
      store.showToast({ type: 'error', message });
    } finally {
      store.dlSetLoading(false);
      store.dlSetResolving(false);
    }
  };

  const handleDownloadSelected = async () => {
    const filesToDownload = selectedDirectFiles;
    if (filesToDownload.length === 0) {
      store.showToast({ type: 'error', message: 'Nenhum arquivo selecionado para download' });
      return;
    }

    store.dlSetDownloading(true);
    store.dlSetDownloadProgress(0, filesToDownload.length);

    for (let i = 0; i < filesToDownload.length; i++) {
      const file = filesToDownload[i];
      store.dlSetDownloadProgress(i + 1, filesToDownload.length);

      try {
        triggerDownload(file.url, file.name || `file-${i}`);
      } catch { /* ignore */ }

      if (i < filesToDownload.length - 1) {
        await new Promise(r => setTimeout(r, store.downloadDelay || 500));
      }
    }

    store.dlSetDownloading(false);
    store.showToast({ type: 'success', message: `${filesToDownload.length} downloads iniciados` });
  };

  const handleDownloadAll = async () => {
    if (directFiles.length === 0) {
      store.showToast({ type: 'error', message: 'Nenhum arquivo direto disponível' });
      return;
    }
    store.dlSetDownloading(true);
    store.dlSetDownloadProgress(0, directFiles.length);
    for (let i = 0; i < directFiles.length; i++) {
      const file = directFiles[i];
      store.dlSetDownloadProgress(i + 1, directFiles.length);
      try {
        triggerDownload(file.url, file.name || `file-${i}`);
      } catch { /* ignore */ }
      if (i < directFiles.length - 1) {
        await new Promise(r => setTimeout(r, store.downloadDelay || 500));
      }
    }
    store.dlSetDownloading(false);
    store.showToast({ type: 'success', message: `${directFiles.length} downloads iniciados` });
  };

  const handleCopyAllUrls = async () => {
    const urls = filteredFiles
      .filter(f => state.selectedFiles.includes(f.id))
      .map(f => f.url)
      .join('\n');
    if (urls) {
      await copyToClipboard(urls);
      store.showToast({ type: 'success', message: `${filteredFiles.filter(f => state.selectedFiles.includes(f.id)).length} URLs copiadas` });
    }
  };

  const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => state.selectedFiles.includes(f.id));

  return (
    <div className="space-y-4">
      {/* URL Input with Drag & Drop */}
      <div
        className={`bg-slate-800 border-2 border-dashed rounded-xl p-3 sm:p-4 transition-all duration-200 ${
          isDragging ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging ? (
          <div className="text-center py-4">
            <p className="text-sm text-cyan-400 font-medium">Solte a URL aqui</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={state.urlInput}
              onChange={(e) => store.dlSetUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
              onPaste={handlePaste}
              placeholder="URL do álbum Bunkr, link direto, ou arraste/cole..."
              className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all font-mono min-h-[44px]"
            />
            <GradientButton
              onClick={() => handleFetch()}
              loading={state.loading}
              className="whitespace-nowrap"
            >
              Listar
            </GradientButton>
          </div>
        )}
      </div>

      {/* Resolving Progress */}
      <AnimatePresence>
        {state.resolving && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800 border border-slate-600 rounded-xl p-3 sm:p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs sm:text-sm text-slate-300">
                Resolvendo {state.resolveProgress.current}/{state.resolveProgress.total}
              </span>
            </div>
            <ProgressBar current={state.resolveProgress.current} total={state.resolveProgress.total} />
            {state.resolveProgress.filename && (
              <p className="text-[10px] text-slate-500 mt-1 truncate font-mono">
                {state.resolveProgress.filename}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {state.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
          {state.error}
        </div>
      )}

      {/* Files */}
      <AnimatePresence>
        {state.files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 border border-slate-600 rounded-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-600/50">
              <div>
                <h3 className="text-sm sm:text-base font-medium text-slate-200">{state.albumName}</h3>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  {filteredFiles.length} de {state.files.length} arquivo{state.files.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => allSelected ? store.dlDeselectAll() : store.dlSelectAll()}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {allSelected ? 'Desselecionar' : 'Selecionar Tudo'}
              </button>
            </div>

            <div className="flex items-center gap-4 px-3 sm:px-4 py-2 border-b border-slate-600/50 bg-slate-800/50">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] sm:text-xs text-slate-400">Download direto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] sm:text-xs text-slate-400">Pendente</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 p-3 sm:p-4 border-b border-slate-600/50">
              <div className="flex-1">
                <input
                  type="text"
                  value={state.includeFilter}
                  onChange={(e) => store.dlSetIncludeFilter(e.target.value)}
                  placeholder="Incluir: .mp4, .jpg ou nome"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[40px]"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={state.excludeFilter}
                  onChange={(e) => store.dlSetExcludeFilter(e.target.value)}
                  placeholder="Ignorar: .txt, .html ou nome"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[40px]"
                />
              </div>
            </div>

            <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto scrollbar-thin">
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file, index) => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    selected={state.selectedFiles.includes(file.id)}
                    onSelect={store.dlToggleFile}
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
                  <GradientButton
                    onClick={handleDownloadAll}
                    loading={state.downloading}
                    disabled={directFiles.length === 0}
                    variant="success"
                  >
                    Download All ({directFiles.length})
                  </GradientButton>
                  <button
                    onClick={handleCopyAllUrls}
                    disabled={filteredFiles.filter(f => state.selectedFiles.includes(f.id)).length === 0}
                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    Copiar URLs
                  </button>
                </div>
                {state.downloading && (
                  <ProgressBar current={state.downloadProgress.current} total={state.downloadProgress.total} />
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {state.files.length === 0 && !state.loading && !state.resolving && (
        <div className="flex flex-col items-center py-12 sm:py-16 text-slate-600">
          <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 mb-4" />
          <p className="text-sm sm:text-base text-slate-500 text-center px-4">
            Cole uma URL de álbum Bunkr ou link direto do CDN
          </p>
          <p className="text-xs text-slate-600 mt-2 text-center max-w-md">
            Aceita: URLs de álbum (<code>bunkr.cr/a/...</code>), páginas de arquivo, ou links diretos do CDN
          </p>
        </div>
      )}
    </div>
  );
}
