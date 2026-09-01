/**
 * Detect if running in a Capacitor native environment (Android/iOS).
 * When running natively, CORS is not enforced by the OS, so we can
 * make direct HTTP requests without a CORS proxy.
 */

export function isNativePlatform(): boolean {
  try {
    // Capacitor sets navigator.userAgent to include "Capacitor"
    const ua = navigator.userAgent || '';
    if (ua.includes('Capacitor')) return true;

    // Check for the Capacitor global object
    if (typeof (window as any).Capacitor !== 'undefined') return true;

    // Check protocol — Capacitor uses capacitor:// or https:// with localhost
    if (window.location.protocol === 'capacitor:') return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * In native platform, bypass CORS proxy and fetch directly.
 * In web browser, use the configured CORS proxy.
 */
export function shouldUseProxy(proxyUrl: string | undefined): string | undefined {
  if (isNativePlatform()) return undefined;
  return proxyUrl;
}

/**
 * Trigger a file download. In native platform, opens the URL in the system
 * download manager. In web, uses proxy URL for CORS or opens in new tab.
 */
export function triggerDownload(url: string, filename: string, proxyUrl?: string): void {
  // Fix double slashes in URL
  let cleanUrl = url.replace(/\/\//g, '/');
  
  if (isNativePlatform()) {
    // In Capacitor/Android, window.open triggers the system download handler
    window.open(cleanUrl, '_blank');
  } else {
    // For CDN URLs that need proxy, use the proxy URL
    const needsProxy = cleanUrl.includes('cdn.cr') || cleanUrl.includes('bunkr.');
    
    if (needsProxy && proxyUrl) {
      // Use proxy to avoid CORS issues
      const proxy = proxyUrl.replace(/\/$/, '');
      let proxiedUrl: string;
      if (proxy.includes('url=')) {
        proxiedUrl = `${proxy}${encodeURIComponent(cleanUrl)}`;
      } else if (proxy.includes('?')) {
        proxiedUrl = `${proxy}&url=${encodeURIComponent(cleanUrl)}`;
      } else {
        proxiedUrl = `${proxy}?url=${encodeURIComponent(cleanUrl)}`;
      }
      window.open(proxiedUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Try direct download, fallback to new tab
      try {
        const a = document.createElement('a');
        a.href = cleanUrl;
        a.download = filename || 'download';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Fallback after short delay
        setTimeout(() => {
          window.open(cleanUrl, '_blank', 'noopener,noreferrer');
        }, 100);
      } catch {
        window.open(cleanUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }
}
