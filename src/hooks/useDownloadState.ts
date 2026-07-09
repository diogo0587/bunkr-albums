import { useReducer, useCallback } from 'react';
import type { BunkrFile } from '@/types';

interface DownloadState {
  urlInput: string;
  loading: boolean;
  files: BunkrFile[];
  selectedFiles: Set<string>;
  includeFilter: string;
  excludeFilter: string;
  downloading: boolean;
  downloadProgress: { current: number; total: number };
  error: string | null;
  albumName: string;
}

type Action =
  | { type: 'SET_URL'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILES'; payload: { files: BunkrFile[]; albumName: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'TOGGLE_FILE'; payload: string }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_INCLUDE_FILTER'; payload: string }
  | { type: 'SET_EXCLUDE_FILTER'; payload: string }
  | { type: 'SET_DOWNLOADING'; payload: boolean }
  | { type: 'SET_DOWNLOAD_PROGRESS'; payload: { current: number; total: number } }
  | { type: 'RESET' };

const initialState: DownloadState = {
  urlInput: '',
  loading: false,
  files: [],
  selectedFiles: new Set(),
  includeFilter: '',
  excludeFilter: '',
  downloading: false,
  downloadProgress: { current: 0, total: 0 },
  error: null,
  albumName: '',
};

function reducer(state: DownloadState, action: Action): DownloadState {
  switch (action.type) {
    case 'SET_URL':
      return { ...state, urlInput: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_FILES':
      return {
        ...state,
        files: action.payload.files,
        albumName: action.payload.albumName,
        selectedFiles: new Set(action.payload.files.map((f) => f.id)),
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'TOGGLE_FILE': {
      const newSelected = new Set(state.selectedFiles);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return { ...state, selectedFiles: newSelected };
    }
    case 'SELECT_ALL':
      return { ...state, selectedFiles: new Set(state.files.map((f) => f.id)) };
    case 'DESELECT_ALL':
      return { ...state, selectedFiles: new Set() };
    case 'SET_INCLUDE_FILTER':
      return { ...state, includeFilter: action.payload };
    case 'SET_EXCLUDE_FILTER':
      return { ...state, excludeFilter: action.payload };
    case 'SET_DOWNLOADING':
      return { ...state, downloading: action.payload };
    case 'SET_DOWNLOAD_PROGRESS':
      return { ...state, downloadProgress: action.payload };
    case 'RESET':
      return { ...initialState, urlInput: state.urlInput };
    default:
      return state;
  }
}

export function useDownloadState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setUrl = useCallback((url: string) => dispatch({ type: 'SET_URL', payload: url }), []);
  const setLoading = useCallback((loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }), []);
  const setFiles = useCallback((files: BunkrFile[], albumName: string) => dispatch({ type: 'SET_FILES', payload: { files, albumName } }), []);
  const setError = useCallback((error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }), []);
  const toggleFile = useCallback((id: string) => dispatch({ type: 'TOGGLE_FILE', payload: id }), []);
  const selectAll = useCallback(() => dispatch({ type: 'SELECT_ALL' }), []);
  const deselectAll = useCallback(() => dispatch({ type: 'DESELECT_ALL' }), []);
  const setIncludeFilter = useCallback((filter: string) => dispatch({ type: 'SET_INCLUDE_FILTER', payload: filter }), []);
  const setExcludeFilter = useCallback((filter: string) => dispatch({ type: 'SET_EXCLUDE_FILTER', payload: filter }), []);
  const setDownloading = useCallback((downloading: boolean) => dispatch({ type: 'SET_DOWNLOADING', payload: downloading }), []);
  const setDownloadProgress = useCallback((current: number, total: number) => dispatch({ type: 'SET_DOWNLOAD_PROGRESS', payload: { current, total } }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
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
    reset,
  };
}
