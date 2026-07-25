export const BUNKR_HOSTS = [
  'bunkr.sk', 'bunkr.ru', 'bunkr.si', 'bunkr.is', 'bunkr.ph',
  'bunkr.ax', 'bunkr.cr', 'bunkr.cat', 'bunkr.ac', 'bunkr.la',
  'bunkr.ws', 'bunkr.st', 'bunkr.fi', 'bunkr.ci', 'bunkr.ps',
  'bunkr.ch', 'bunkr.cm', 'bunkr.vc', 'bunkr.cl', 'bunkr.pm',
  'bunkr.sh', 'bunkr.to', 'bunkr.sg', 'bunkr.pt', 'bunkr.frl',
  'bunkr.studio', 'bunkr.black', 'bunkr.ec', 'bunkr.hk', 'bunkr.nu',
  'bunkr.gy', 'bunkr.li', 'bunkr.pe', 'bunkr.tk', 'bunkr.at',
  'bunkr.blue', 'bunkr.red', 'bunkr.green', 'bunkr.today', 'bunkr.email',
  // CDN / storage domains
  'cdn.cr', 'scdn.st', 'bunkrr.su', 'bunkr.party',
];

export const CDN_DOMAINS = [
  'cdn.cr', 'scdn.st',
];

export function isBunkrUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return BUNKR_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host));
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
    // CDN storage links with media in path
    if (pathname.includes('/storage/media/') || pathname.includes('/thumbs/')) return true;
    // Direct file extensions
    if (/\.(mp4|webm|mkv|avi|mov|jpg|jpeg|png|gif|webp|mp3|wav|flac|zip|rar)(\?|$)/i.test(pathname)) return true;
    // Token-based CDN links
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
