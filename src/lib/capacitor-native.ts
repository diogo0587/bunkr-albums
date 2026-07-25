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
 * download manager. In web, uses anchor element click.
 */
export function triggerDownload(url: string, filename: string): void {
  if (isNativePlatform()) {
    // In Capacitor/Android, window.open triggers the system download handler
    window.open(url, '_blank');
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
