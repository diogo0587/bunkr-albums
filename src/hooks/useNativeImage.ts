import { useState, useEffect, useCallback, useMemo } from 'react';
import { isNativePlatform } from '@/lib/capacitor-native';
import { APP_PROXY_URL } from '@/lib/app-proxy';

/**
 * In-memory cache for blob URLs created from fetched images.
 * Prevents re-fetching the same thumbnail on every render.
 */
const blobCache = new Map<string, string>();
const inflightMap = new Map<string, Promise<string>>();

function fetchImageAsBlob(url: string): Promise<string> {
  if (blobCache.has(url)) return Promise.resolve(blobCache.get(url)!);
  if (inflightMap.has(url)) return inflightMap.get(url)!;

  const p = fetch(url, { redirect: 'follow' })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      blobCache.set(url, blobUrl);
      inflightMap.delete(url);
      return blobUrl;
    })
    .catch((err) => {
      inflightMap.delete(url);
      throw err;
    });

  inflightMap.set(url, p);
  return p;
}

/**
 * Hook that loads an image URL as a blob URL on native platforms.
 * Returns the blob URL once loaded, or the original URL on web.
 */
export function useNativeImage(src: string | undefined): {
  src: string;
  loading: boolean;
  error: boolean;
  retry: () => void;
} {
  const isNative = isNativePlatform();
  const candidates = useMemo(() => {
    if (!src) return [];
    const secureSrc = src.replace(/^http:/i, 'https:');
    const proxied = `${APP_PROXY_URL}${encodeURIComponent(secureSrc)}&referer=${encodeURIComponent('https://balbums.st/')}`;
    return secureSrc === proxied ? [secureSrc] : [secureSrc, proxied];
  }, [src]);
  const [attemptState, setAttemptState] = useState({ source: src || '', attempt: 0 });
  const attempt = attemptState.source === (src || '') ? attemptState.attempt : 0;
  const [blobState, setBlobState] = useState({ candidate: '', url: '' });
  const candidate = candidates[attempt] || '';
  const error = Boolean(src) && attempt >= candidates.length;

  const retry = useCallback(() => {
    setAttemptState((current) => {
      const currentAttempt = current.source === (src || '') ? current.attempt : 0;
      return { source: src || '', attempt: Math.min(currentAttempt + 1, candidates.length) };
    });
  }, [candidates.length, src]);

  useEffect(() => {
    let cancelled = false;
    if (!candidate || !isNative || blobCache.has(candidate)) return;

    fetchImageAsBlob(candidate)
      .then((url) => {
        if (!cancelled) {
          setBlobState({ candidate, url });
        }
      })
      .catch(() => {
        if (!cancelled) {
          retry();
        }
      });
    return () => { cancelled = true; };
  }, [candidate, isNative, retry]);

  if (!isNative) return { src: error ? '' : candidate, loading: false, error, retry };
  const cachedUrl = blobCache.get(candidate) || '';
  const blobUrl = cachedUrl || (blobState.candidate === candidate ? blobState.url : '');
  return { src: blobUrl, loading: Boolean(candidate && !blobUrl && !error), error, retry };
}
