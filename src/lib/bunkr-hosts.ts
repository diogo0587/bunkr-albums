/**
 * Domain inventory synchronized with gallery-dl's maintained Bunkr extractor.
 * Current, legacy and infrastructure hosts remain separate so the UI does not
 * present an old mirror as healthy while URL validation stays compatible.
 */
export const CURRENT_BUNKR_HOSTS = [
  'bunkr.ac', 'bunkr.ci', 'bunkr.cr', 'bunkr.fi', 'bunkr.ph',
  'bunkr.pk', 'bunkr.ps', 'bunkr.si', 'bunkr.sk', 'bunkr.ws',
  'bunkr.black', 'bunkr.red', 'bunkr.media', 'bunkr.site', 'bunkr.org',
];

export const LEGACY_BUNKR_HOSTS = [
  'bunkr.ax', 'bunkr.cat', 'bunkr.ru', 'bunkrr.ru', 'bunkr.su',
  'bunkrr.su', 'bunkr.la', 'bunkr.is', 'bunkr.to', 'bunkr.st',
  'bunkr.ch', 'bunkr.cm',
];

export const COMPATIBLE_BUNKR_HOSTS = [
  'bunkr.sg', 'bunkr.pt', 'bunkr.frl', 'bunkr.studio', 'bunkr.ec',
  'bunkr.hk', 'bunkr.nu', 'bunkr.gy', 'bunkr.li', 'bunkr.pe',
  'bunkr.tk', 'bunkr.at', 'bunkr.blue', 'bunkr.green', 'bunkr.today',
  'bunkr.email', 'bunkr.vc', 'bunkr.cl', 'bunkr.pm', 'bunkr.sh',
];

export const BUNKR_INFRASTRUCTURE_HOSTS = [
  'get.bunkrr.su', 'apidl.bunkr.ru', 'dl.bunkr.cr',
  'cdn.cr', 'scdn.st', 'bunkr.party',
];

export const BUNKR_HOSTS = Array.from(new Set([
  ...CURRENT_BUNKR_HOSTS,
  ...LEGACY_BUNKR_HOSTS,
  ...COMPATIBLE_BUNKR_HOSTS,
  ...BUNKR_INFRASTRUCTURE_HOSTS,
]));

export const CDN_DOMAINS = ['cdn.cr', 'scdn.st'];

const BUNKR_PAGE_HOST_PATTERN = /^(?:app\.)?bunkrr?\.[a-z0-9.-]+$/i;

export function isBunkrUrl(url: string): boolean {
  try {
    return BUNKR_PAGE_HOST_PATTERN.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isCdnUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return CDN_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

export function isDirectFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    if (pathname.includes('/storage/media/') || pathname.includes('/thumbs/')) return true;
    if (/\.(mp4|webm|mkv|avi|mov|jpg|jpeg|png|gif|webp|mp3|wav|flac|zip|rar)(\?|$)/i.test(pathname)) return true;
    if (parsed.searchParams.has('token') && parsed.searchParams.has('ex')) return true;
    return false;
  } catch {
    return false;
  }
}

export function extractAlbumId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/a\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
