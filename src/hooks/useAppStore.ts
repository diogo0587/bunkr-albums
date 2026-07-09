import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryEntry, ToastData, TabValue, BunkrFile } from '@/types';

export type ProxyProvider = 'corsproxy' | 'allorigins' | 'codetabs' | 'custom';

export const PROXY_PROVIDERS: Record<ProxyProvider, { label: string; url: string }> = {
  corsproxy: { label: 'corsproxy.io (recomendado)', url: 'https://corsproxy.io/?' },
  allorigins: { label: 'allorigins.win', url: 'https://api.allorigins.win/raw?url=' },
  codetabs: { label: 'codetabs.com', url: 'https://api.codetabs.com/v1/proxy?quest=' },
  custom: { label: 'Proxy personalizado', url: '' },
};

interface AppState {
  activeTab: TabValue;
  proxyEnabled: boolean;
  proxyProvider: ProxyProvider;
  proxyUrl: string;
  downloadDelay: number;
  history: HistoryEntry[];
  toast: ToastData | null;
  // Persisted downloads (new)
  savedDownloads: Record<string, { files: BunkrFile[]; albumName: string; timestamp: number }>;
  pendingUrl: string; // URL to auto-load when switching to download tab

  setActiveTab: (tab: TabValue) => void;
  setProxyEnabled: (v: boolean) => void;
  setProxyProvider: (provider: ProxyProvider) => void;
  setProxyUrl: (url: string) => void;
  setDownloadDelay: (ms: number) => void;
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  showToast: (toast: ToastData) => void;
  hideToast: () => void;
  // Saved downloads
  saveDownload: (url: string, files: BunkrFile[], albumName: string) => void;
  removeSavedDownload: (url: string) => void;
  clearSavedDownloads: () => void;
  setPendingUrl: (url: string) => void;
}

export function getEffectiveProxyUrl(state: { proxyEnabled: boolean; proxyProvider: ProxyProvider; proxyUrl: string }): string | undefined {
  if (!state.proxyEnabled) return undefined;
  
  if (state.proxyProvider === 'custom') {
    if (state.proxyUrl.trim()) return state.proxyUrl.trim();
    // Fallback to default if custom is empty
    return PROXY_PROVIDERS.corsproxy.url;
  }
  
  return PROXY_PROVIDERS[state.proxyProvider]?.url || PROXY_PROVIDERS.corsproxy.url;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'search',
      proxyEnabled: true,
      proxyProvider: 'corsproxy',
      proxyUrl: '',
      downloadDelay: 1500,
      history: [],
      toast: null,
      savedDownloads: {},
      pendingUrl: '',

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
        // pendingUrl is NOT persisted - it's temporary
      }),
    }
  )
);
