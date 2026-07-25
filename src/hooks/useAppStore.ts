import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryEntry, ToastData, TabValue, BunkrFile, BatchResult } from '@/types';

export type ProxyProvider = 'corsproxy' | 'allorigins' | 'codetabs' | 'corsproxysh' | 'custom';

export const PROXY_PROVIDERS: Record<ProxyProvider, { label: string; url: string }> = {
  corsproxy: { label: 'corsproxy.io (recomendado)', url: 'https://corsproxy.io/?url=' },
  allorigins: { label: 'allorigins.win', url: 'https://api.allorigins.win/raw?url=' },
  codetabs: { label: 'codetabs.com', url: 'https://api.codetabs.com/v1/proxy?quest=' },
  corsproxysh: { label: 'corsproxy.sh', url: 'https://proxy.cors.sh/' },
  custom: { label: 'Proxy personalizado', url: '' },
};

// ── Download state (moved from useDownloadState) ──
interface DownloadState {
  urlInput: string;
  loading: boolean;
  files: BunkrFile[];
  selectedFiles: string[]; // serializable
  includeFilter: string;
  excludeFilter: string;
  downloading: boolean;
  downloadProgress: { current: number; total: number };
  error: string | null;
  albumName: string;
  resolving: boolean;
  resolveProgress: { current: number; total: number; filename: string };
}

// ── Batch state (moved from useBatchState) ──
interface BatchState {
  urls: string;
  processing: boolean;
  results: BatchResult[];
  progress: { current: number; total: number };
}

interface AppState {
  activeTab: TabValue;
  proxyEnabled: boolean;
  proxyProvider: ProxyProvider;
  proxyUrl: string;
  downloadDelay: number;
  history: HistoryEntry[];
  toast: ToastData | null;
  savedDownloads: Record<string, { files: BunkrFile[]; albumName: string; timestamp: number }>;
  pendingUrl: string;

  // Download state
  download: DownloadState;
  // Batch state
  batch: BatchState;

  setActiveTab: (tab: TabValue) => void;
  setProxyEnabled: (v: boolean) => void;
  setProxyProvider: (provider: ProxyProvider) => void;
  setProxyUrl: (url: string) => void;
  setDownloadDelay: (ms: number) => void;
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  showToast: (toast: ToastData) => void;
  hideToast: () => void;
  saveDownload: (url: string, files: BunkrFile[], albumName: string) => void;
  removeSavedDownload: (url: string) => void;
  clearSavedDownloads: () => void;
  setPendingUrl: (url: string) => void;

  // Download actions
  dlSetUrl: (url: string) => void;
  dlSetLoading: (v: boolean) => void;
  dlSetFiles: (files: BunkrFile[], albumName: string) => void;
  dlSetError: (error: string | null) => void;
  dlToggleFile: (id: string) => void;
  dlSelectAll: () => void;
  dlDeselectAll: () => void;
  dlSetIncludeFilter: (f: string) => void;
  dlSetExcludeFilter: (f: string) => void;
  dlSetDownloading: (v: boolean) => void;
  dlSetDownloadProgress: (current: number, total: number) => void;
  dlSetResolving: (v: boolean) => void;
  dlSetResolveProgress: (current: number, total: number, filename: string) => void;
  dlReset: () => void;

  // Batch actions
  btSetUrls: (urls: string) => void;
  btSetProcessing: (v: boolean) => void;
  btSetResults: (results: BatchResult[]) => void;
  btUpdateResult: (index: number, result: BatchResult) => void;
  btSetProgress: (current: number, total: number) => void;
  btReset: () => void;
}

const defaultDownload: DownloadState = {
  urlInput: '',
  loading: false,
  files: [],
  selectedFiles: [],
  includeFilter: '',
  excludeFilter: '',
  downloading: false,
  downloadProgress: { current: 0, total: 0 },
  error: null,
  albumName: '',
  resolving: false,
  resolveProgress: { current: 0, total: 0, filename: '' },
};

const defaultBatch: BatchState = {
  urls: '',
  processing: false,
  results: [],
  progress: { current: 0, total: 0 },
};

export function getEffectiveProxyUrl(state: { proxyEnabled: boolean; proxyProvider: ProxyProvider; proxyUrl: string }): string | undefined {
  if (!state.proxyEnabled) return undefined;
  if (state.proxyProvider === 'custom') {
    if (state.proxyUrl.trim()) return state.proxyUrl.trim();
    return PROXY_PROVIDERS.corsproxy.url;
  }
  return PROXY_PROVIDERS[state.proxyProvider]?.url || PROXY_PROVIDERS.corsproxy.url;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'search',
      proxyEnabled: true,
      proxyProvider: 'corsproxy',
      proxyUrl: '',
      downloadDelay: 1500,
      history: [],
      toast: null,
      savedDownloads: {},
      pendingUrl: '',
      download: { ...defaultDownload },
      batch: { ...defaultBatch },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setProxyEnabled: (v) => set({ proxyEnabled: v }),
      setProxyProvider: (provider) => set({ proxyProvider: provider }),
      setProxyUrl: (url) => set({ proxyUrl: url }),
      setDownloadDelay: (ms) => set({ downloadDelay: Math.max(0, Math.min(10000, ms)) }),
      addHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history.filter((h) => h.url !== entry.url)].slice(0, 20),
        })),
      clearHistory: () => set({ history: [] }),
      showToast: (toast) => set({ toast }),
      hideToast: () => set({ toast: null }),
      saveDownload: (url, files, albumName) =>
        set((state) => ({
          savedDownloads: {
            ...state.savedDownloads,
            [url]: { files, albumName, timestamp: Date.now() },
          },
        })),
      removeSavedDownload: (url) =>
        set((state) => {
          const { [url]: _, ...rest } = state.savedDownloads;
          return { savedDownloads: rest };
        }),
      clearSavedDownloads: () => set({ savedDownloads: {} }),
      setPendingUrl: (url) => set({ pendingUrl: url }),

      // ── Download actions ──
      dlSetUrl: (url) => set((s) => ({ download: { ...s.download, urlInput: url } })),
      dlSetLoading: (v) => set((s) => ({ download: { ...s.download, loading: v, error: null } })),
      dlSetFiles: (files, albumName) =>
        set((s) => ({
          download: {
            ...s.download,
            files,
            albumName,
            selectedFiles: files.map((f) => f.id),
            loading: false,
            error: null,
          },
        })),
      dlSetError: (error) => set((s) => ({ download: { ...s.download, error, loading: false } })),
      dlToggleFile: (id) =>
        set((s) => {
          const sel = new Set(s.download.selectedFiles);
          if (sel.has(id)) sel.delete(id); else sel.add(id);
          return { download: { ...s.download, selectedFiles: Array.from(sel) } };
        }),
      dlSelectAll: () =>
        set((s) => ({ download: { ...s.download, selectedFiles: s.download.files.map((f) => f.id) } })),
      dlDeselectAll: () => set((s) => ({ download: { ...s.download, selectedFiles: [] } })),
      dlSetIncludeFilter: (f) => set((s) => ({ download: { ...s.download, includeFilter: f } })),
      dlSetExcludeFilter: (f) => set((s) => ({ download: { ...s.download, excludeFilter: f } })),
      dlSetDownloading: (v) => set((s) => ({ download: { ...s.download, downloading: v } })),
      dlSetDownloadProgress: (current, total) =>
        set((s) => ({ download: { ...s.download, downloadProgress: { current, total } } })),
      dlSetResolving: (v) => set((s) => ({ download: { ...s.download, resolving: v } })),
      dlSetResolveProgress: (current, total, filename) =>
        set((s) => ({ download: { ...s.download, resolveProgress: { current, total, filename } } })),
      dlReset: () => set((s) => ({ download: { ...defaultDownload, urlInput: s.download.urlInput } })),

      // ── Batch actions ──
      btSetUrls: (urls) => set((s) => ({ batch: { ...s.batch, urls } })),
      btSetProcessing: (v) => set((s) => ({ batch: { ...s.batch, processing: v } })),
      btSetResults: (results) => set((s) => ({ batch: { ...s.batch, results } })),
      btUpdateResult: (index, result) =>
        set((s) => {
          const r = [...s.batch.results];
          r[index] = result;
          return { batch: { ...s.batch, results: r } };
        }),
      btSetProgress: (current, total) =>
        set((s) => ({ batch: { ...s.batch, progress: { current, total } } })),
      btReset: () => set((s) => ({ batch: { ...defaultBatch, urls: s.batch.urls } })),
    }),
    {
      name: 'bunkr-downloader-storage',
      partialize: (state) => ({
        proxyEnabled: state.proxyEnabled,
        proxyProvider: state.proxyProvider,
        proxyUrl: state.proxyUrl,
        downloadDelay: state.downloadDelay,
        history: state.history,
        savedDownloads: state.savedDownloads,
        // Persist download state so it survives tab switches
        download: {
          urlInput: state.download.urlInput,
          files: state.download.files,
          selectedFiles: state.download.selectedFiles,
          albumName: state.download.albumName,
          includeFilter: state.download.includeFilter,
          excludeFilter: state.download.excludeFilter,
          // Don't persist transient states
        },
        batch: {
          urls: state.batch.urls,
          results: state.batch.results,
        },
      }),
    }
  )
);
