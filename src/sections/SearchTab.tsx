import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, Image, Video, FileArchive, FolderOpen, Radio, Grid3X3, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { AlbumCard } from '@/components/AlbumCard';
import { searchBalbums, type CategoryMode, type SearchMode, type SortMode, type BalbumsResult, type BalbumsAlbum } from '@/lib/balbums-client';
import { useAppStore, getEffectiveProxyUrl } from '@/hooks/useAppStore';

const categories: { value: CategoryMode; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Todos', icon: <Grid3X3 className="w-4 h-4" /> },
  { value: 'albums', label: 'Álbuns', icon: <FolderOpen className="w-4 h-4" /> },
  { value: 'videos', label: 'Vídeos', icon: <Video className="w-4 h-4" /> },
  { value: 'images', label: 'Imagens', icon: <Image className="w-4 h-4" /> },
  { value: 'files', label: 'Arquivos', icon: <FileArchive className="w-4 h-4" /> },
  { value: 'live', label: 'Live', icon: <Radio className="w-4 h-4" /> },
];

export function SearchTab() {
  const store = useAppStore();
  const proxy = getEffectiveProxyUrl(store);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryMode>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('broad');
  const [sort, setSort] = useState<SortMode>('latest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [albums, setAlbums] = useState<BalbumsAlbum[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search function
  const doSearch = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await searchBalbums(query, {
        mode: searchMode,
        sort,
        page: pageNum,
        category,
        proxyUrl: proxy,
      });
      if (append) {
        setAlbums(prev => [...prev, ...res.albums]);
      } else {
        setAlbums(res.albums);
      }
      setTotalPages(res.totalPages);
      setPage(pageNum);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na busca';
      setError(msg);
      if (!append) setAlbums([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, searchMode, sort, category, proxy]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          doSearch(page + 1, true);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, page, totalPages, doSearch]);

  // Pull-to-refresh (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && diff < 150) {
      setPullDistance(diff);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && !loading) {
      setRefreshing(true);
      setPullDistance(0);
      setAlbums([]);
      setPage(1);
      doSearch(1, false);
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  }, [pullDistance, loading, doSearch]);

  const handleSelectAlbum = useCallback((url: string) => {
    store.setPendingUrl(url);
    store.setActiveTab('download');
  }, [store]);

  // Initial load
  useEffect(() => {
    doSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setAlbums([]);
    setPage(1);
    doSearch(1, false);
  };

  return (
    <div
      ref={containerRef}
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || refreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: refreshing ? 48 : pullDistance * 0.6, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <RotateCw
              className={`w-5 h-5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
            <span className="text-xs text-slate-400 ml-2">
              {refreshing ? 'Atualizando...' : pullDistance > 80 ? 'Solte para atualizar' : 'Puxe para baixo'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Header */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 sm:p-6 space-y-3 sm:space-y-4">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch(1)}
              placeholder="Buscar álbuns Bunkr..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[44px]"
            />
          </div>
          <GradientButton
            onClick={() => doSearch(1)}
            loading={loading && albums.length === 0}
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Buscar
          </GradientButton>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Categories */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setAlbums([]); setPage(1); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                  category === cat.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-300'
                }`}
              >
                {cat.icon}
                <span className="hidden sm:inline">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex gap-2 sm:ml-auto">
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortMode); setAlbums([]); setPage(1); }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 outline-none min-h-[36px]"
            >
              <option value="latest">Recentes</option>
              <option value="popular">Populares</option>
              <option value="updated">Atualizados</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {loading && albums.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16 text-slate-500"
          >
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">Carregando álbuns...</p>
          </motion.div>
        ) : albums.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Results header */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-slate-400">
                {query ? `Resultados para "${query}"` : 'Álbuns recentes'}
                {totalPages > 1 && (
                  <span className="text-slate-600 ml-1">— Página {page} de {totalPages}</span>
                )}
              </p>
              <button
                onClick={handleRefresh}
                className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                title="Atualizar"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Album Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {albums.map((album, index) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  index={index}
                  onSelect={handleSelectAlbum}
                />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading more */}
            {loading && albums.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-xs text-slate-400 ml-2">Carregando mais...</span>
              </div>
            )}

            {/* End of results */}
            {!loading && page >= totalPages && albums.length > 0 && (
              <p className="text-center text-xs text-slate-600 py-4">
                Fim dos resultados
              </p>
            )}
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16 text-slate-600"
          >
            <Search className="w-12 h-12 mb-3" />
            <p className="text-sm text-slate-500">Nenhum álbum encontrado</p>
            <p className="text-xs text-slate-600 mt-1">Tente outro termo de busca</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
