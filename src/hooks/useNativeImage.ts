import { useState, useEffect, useRef } from 'react';
import { isNativePlatform } from '@/lib/capacitor-native';

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
} {
  const isNative = isNativePlatform();
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!src || !isNative) {
      setBlobUrl('');
      setLoading(false);
      setError(false);
      return;
    }

    // Already cached
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src)!);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    fetchImageAsBlob(src)
      .then((url) => {
        if (mountedRef.current) {
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setError(true);
          setLoading(false);
        }
      });
  }, [src, isNative]);

  if (!isNative) return { src: src || '', loading: false, error: false };
  return { src: blobUrl, loading, error };
}
