import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Layers, Clock, Globe, Settings } from 'lucide-react';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';
import { useAppStore } from '@/hooks/useAppStore';
import type { TabValue } from '@/types';

// Lazy-loaded tabs
const SearchTab = lazy(() => import('@/sections/SearchTab').then(m => ({ default: m.SearchTab })));
const DownloadTab = lazy(() => import('@/sections/DownloadTab').then(m => ({ default: m.DownloadTab })));
const BatchTab = lazy(() => import('@/sections/BatchTab').then(m => ({ default: m.BatchTab })));
const HistoryTab = lazy(() => import('@/sections/HistoryTab').then(m => ({ default: m.HistoryTab })));
const HostsTab = lazy(() => import('@/sections/HostsTab').then(m => ({ default: m.HostsTab })));
const ConfigTab = lazy(() => import('@/sections/ConfigTab').then(m => ({ default: m.ConfigTab })));

const tabs: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'search', label: 'Buscar', icon: <Search className="w-5 h-5" /> },
  { value: 'download', label: 'Download', icon: <Download className="w-5 h-5" /> },
  { value: 'batch', label: 'Lote', icon: <Layers className="w-5 h-5" /> },
  { value: 'history', label: 'Histórico', icon: <Clock className="w-5 h-5" /> },
  { value: 'hosts', label: 'Hosts', icon: <Globe className="w-5 h-5" /> },
  { value: 'config', label: 'Config', icon: <Settings className="w-5 h-5" /> },
];

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bunkr-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('bunkr-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('bunkr-theme');
      if (!saved) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return { theme, setTheme };
}

export default function App() {
  const { activeTab, setActiveTab, toast, hideToast } = useAppStore();
  const { theme, setTheme } = useTheme();

  // Keyboard shortcuts for tab navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const tabMap: Record<string, TabValue> = {
        '1': 'search', '2': 'download', '3': 'batch',
        '4': 'history', '5': 'hosts', '6': 'config',
      };
      if (tabMap[e.key]) {
        e.preventDefault();
        setActiveTab(tabMap[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setActiveTab]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as TabValue);
  }, [setActiveTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'search':
        return <SearchTab />;
      case 'download':
        return <DownloadTab />;
      case 'batch':
        return <BatchTab />;
      case 'history':
        return <HistoryTab />;
      case 'hosts':
        return <HostsTab />;
      case 'config':
        return <ConfigTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col">
      <Header theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

      {/* Desktop top tabs */}
      <nav className="hidden sm:block bg-slate-800 border-b border-slate-600 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  relative flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap
                  transition-colors duration-200 border-b-2 min-h-[48px]
                  ${
                    activeTab === tab.value
                      ? 'text-cyan-400 border-cyan-500 bg-slate-800'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 pb-20 sm:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Suspense fallback={<TabLoader />}>
              {renderTabContent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-slate-800 border-t border-slate-700 safe-area-pb">
        <div className="flex justify-around items-center px-1 py-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`
                flex flex-col items-center justify-center gap-0.5 w-14 py-1.5 rounded-lg
                transition-colors duration-150 min-h-[52px]
                ${
                  activeTab === tab.value
                    ? 'text-cyan-400'
                    : 'text-slate-500 active:text-slate-300'
                }
              `}
            >
              {tab.icon}
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer (desktop only) */}
      <footer className="hidden sm:block border-t border-slate-800 py-3 px-6 text-center">
        <p className="text-xs text-slate-600">
          BunkrDownloader Pro v2.1 — com integracao balbums.st
        </p>
      </footer>

      {/* Toast */}
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
