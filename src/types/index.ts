export interface BunkrFile {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
  isDirect?: boolean;
}

export interface HistoryEntry {
  url: string;
  timestamp: number;
  fileCount: number;
}

export interface ToastData {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface BatchResult {
  url: string;
  status: 'success' | 'error' | 'pending' | 'loading';
  fileCount: number;
  error?: string;
}

export type TabValue = 'search' | 'download' | 'batch' | 'history' | 'hosts' | 'config';
