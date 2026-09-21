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
export function triggerDownload(url: string, filename: string, _proxyUrl?: string): void {
  // Normalize only the pathname. Replacing every `//` corrupts the protocol
  // (`https://` became `https:/`) and makes every download URL invalid.
  let cleanUrl: string;
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
    cleanUrl = parsed.toString();
  } catch {
    cleanUrl = url;
  }
  
  if (isNativePlatform()) {
    // In Capacitor/Android, window.open triggers the system download handler
    window.open(cleanUrl, '_blank');
  } else {
    // Never relay large media through a Vercel Function. Serverless response
    // limits truncate videos and Chrome reports ERR_INVALID_RESPONSE.
    // A top-level navigation to the signed CDN URL does not require CORS.
    const a = document.createElement('a');
    a.href = cleanUrl;
    a.download = filename || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}