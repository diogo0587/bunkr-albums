import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Layers, Clock, Globe, Settings } from 'lucide-react';
import { Header } from '@/components/Header';
import { Toast } from '@/components/Toast';
import { SearchTab } from '@/sections/SearchTab';
import { DownloadTab } from '@/sections/DownloadTab';
import { BatchTab } from '@/sections/BatchTab';
import { HistoryTab } from '@/sections/HistoryTab';
import { HostsTab } from '@/sections/HostsTab';
import { ConfigTab } from '@/sections/ConfigTab';
import { useAppStore } from '@/hooks/useAppStore';
import type { TabValue } from '@/types';

const tabs: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'search', label: 'Buscar', icon: <Search className="w-4 h-4" /> },
  { value: 'download', label: 'Download', icon: <Download className="w-4 h-4" /> },
  { value: 'batch', label: 'Lote', icon: <Layers className="w-4 h-4" /> },
  { value: 'history', label: 'Histórico', icon: <Clock className="w-4 h-4" /> },
  { value: 'hosts', label: 'Hosts', icon: <Globe className="w-4 h-4" /> },
  { value: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> },
];

export default function App() {
  const { activeTab, setActiveTab, toast, hideToast } = useAppStore();

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
      <Header />

      {/* Tabs */}
      <nav className="bg-slate-800 border-b border-slate-600 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium whitespace-nowrap
                  transition-colors duration-200 border-b-2 min-h-[48px]
                  ${
                    activeTab === tab.value
                      ? 'text-cyan-400 border-cyan-500 bg-slate-800'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }
                `}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-3 px-4 sm:px-6 text-center">
        <p className="text-[11px] sm:text-xs text-slate-600">
          BunkrDownloader Pro v2.1 — com integracao balbums.st
        </p>
      </footer>

      {/* Toast */}
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
