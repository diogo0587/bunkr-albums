import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Image, Video, FileArchive, FolderOpen, Radio, Grid3X3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GradientButton } from '@/components/GradientButton';
import { AlbumCard } from '@/components/AlbumCard';
import { searchBalbums, type CategoryMode, type SearchMode, type SortMode, type BalbumsResult } from '@/lib/balbums-client';
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
  const [result, setResult] = useState<BalbumsResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async (pageNum = 1) => {
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
      setResult(res);
      setPage(pageNum);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na busca';
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query, searchMode, sort, category, proxy]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (result && newPage > result.totalPages)) return;
    handleSearch(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAlbum = useCallback((url: string) => {
    store.setPendingUrl(url);
    store.setActiveTab('download');
  }, [store]);

  // Popular search on load (empty query = recent)
  useEffect(() => {
    handleSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 sm:p-6 space-y-4">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
              placeholder="Buscar álbuns Bunkr..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none transition-all min-h-[44px]"
            />
          </div>
          <GradientButton
            onClick={() => handleSearch(1)}
            loading={loading}
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
                onClick={() => { setCategory(cat.value); setPage(1); handleSearch(1); }}
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

          {/* Mode & Sort */}
          <div className="flex gap-2 ml-auto">
            <select
              value={searchMode}
              onChange={(e) => { setSearchMode(e.target.value as SearchMode); }}
              className="px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-300 outline-none focus:border-cyan-500 min-h-[36px]"
            >
              <option value="broad">Ampla</option>
              <option value="exact">Exata</option>
            </select>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortMode); }}
              className="px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs text-slate-300 outline-none focus:border-cyan-500 min-h-[36px]"
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
        {loading && !result ? (
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
        ) : result && result.albums.length > 0 ? (
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
                <span className="text-slate-600 ml-1">— Página {page} de {result.totalPages}</span>
              </p>
            </div>

            {/* Album Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {result.albums.map((album, index) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  index={index}
                  onSelect={handleSelectAlbum}
                />
              ))}
            </div>

            {/* Pagination */}
            {result.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, result.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (result.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= result.totalPages - 2) {
                      pageNum = result.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= result.totalPages}
                  className="flex items-center gap-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
