import { useReducer, useCallback } from 'react';
import type { BatchResult } from '@/types';

interface BatchState {
  urls: string;
  processing: boolean;
  results: BatchResult[];
  progress: { current: number; total: number };
}

type Action =
  | { type: 'SET_URLS'; payload: string }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: BatchResult[] }
  | { type: 'UPDATE_RESULT'; payload: { index: number; result: BatchResult } }
  | { type: 'SET_PROGRESS'; payload: { current: number; total: number } }
  | { type: 'RESET' };

const initialState: BatchState = {
  urls: '',
  processing: false,
  results: [],
  progress: { current: 0, total: 0 },
};

function reducer(state: BatchState, action: Action): BatchState {
  switch (action.type) {
    case 'SET_URLS':
      return { ...state, urls: action.payload };
    case 'SET_PROCESSING':
      return { ...state, processing: action.payload };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'UPDATE_RESULT': {
      const newResults = [...state.results];
      newResults[action.payload.index] = action.payload.result;
      return { ...state, results: newResults };
    }
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'RESET':
      return { ...initialState, urls: state.urls };
    default:
      return state;
  }
}

export function useBatchState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setUrls = useCallback((urls: string) => dispatch({ type: 'SET_URLS', payload: urls }), []);
  const setProcessing = useCallback((processing: boolean) => dispatch({ type: 'SET_PROCESSING', payload: processing }), []);
  const setResults = useCallback((results: BatchResult[]) => dispatch({ type: 'SET_RESULTS', payload: results }), []);
  const updateResult = useCallback((index: number, result: BatchResult) => dispatch({ type: 'UPDATE_RESULT', payload: { index, result } }), []);
  const setProgress = useCallback((current: number, total: number) => dispatch({ type: 'SET_PROGRESS', payload: { current, total } }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    setUrls,
    setProcessing,
    setResults,
    updateResult,
    setProgress,
    reset,
  };
}
