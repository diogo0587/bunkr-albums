import { shouldUseProxy } from './capacitor-native';

import type { BunkrFile } from '@/types';
import { isBunkrUrl, isCdnUrl, isDirectFileUrl } from './bunkr-hosts';

/**
 * Domains known to be dead/parked. Map them to the working bunkr.cr.
 */
const DEAD_BUNKR_DOMAINS: Record<string, string> = {
  'bunkr.st': 'bunkr.cr',
  'bunkr.ru': 'bunkr.cr',
  'bunkr.ch': 'bunkr.cr',
  'bunkr.cm': 'bunkr.cr',
};

/**
 * Detect if a page is a parked/dead domain (domain-for-sale, etc).
 */
function isParkedPage(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('domain for sale') ||
    lower.includes('is for sale') ||
    lower.includes('buy this domain') ||
    lower.includes('depressively.com') ||
    lower.includes('sedoparking') ||
    lower.includes('parkingcrew') ||
    lower.includes('dan.com') ||
    (lower.includes('bunkr') === false && lower.includes('album') === false && lower.includes('video') === false && html.length < 2000)
  );
}

/**
 * Rewrite dead bunkr domain to working one.
 */
export function rewriteBunkrDomain(url: string): string {
  try {
    const parsed = new URL(url);
    const mapped = DEAD_BUNKR_DOMAINS[parsed.hostname];
    if (mapped) {
      parsed.hostname = mapped;
      return parsed.toString();
    }
  } catch {}
  return url;
}


const BUNKR_API = 'https://glb-apisign.cdn.cr/sign';
const DOWNLOAD_API = 'https://dl.bunkr.cr/api/_001_v2';
const DOWNLOAD_REFERER = 'https://get.bunkrr.su/';

export interface ParseResult {
  files: BunkrFile[];
  albumName: string;
}

export interface ResolvedFile extends BunkrFile {
  resolvedUrl: string;
}

export const DEFAULT_CORS_PROXIES = [
  '/api/proxy?url=',
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://proxy.cors.sh/',
];

export function getCorsProxyUrl(targetUrl: string, proxyUrl?: string): string {
  if (!proxyUrl) return targetUrl;
  const proxy = proxyUrl.replace(/\/$/, '');
  if (proxy.includes('allorigins')) return `${proxy}${encodeURIComponent(targetUrl)}`;
  if (proxy.includes('url=')) return `${proxy}${encodeURIComponent(targetUrl)}`;
  if (proxy.includes('?')) return `${proxy}url=${encodeURIComponent(targetUrl)}`;
  return `${proxy}/${targetUrl}`;
}

/**
 * Validate a URL — accepts:
 * 1. Bunkr album URLs (bunkr.cr/a/XXXX)
 * 2. Bunkr file page URLs (bunkr.cr/f/XXXX, bunkr.cr/v/XXXX)
 * 3. Direct CDN file URLs (cdn.cr/storage/media/...mp4?token=...)
 */
export function validateBunkrUrl(url: string): { valid: boolean; error?: string; isDirect?: boolean } {
  if (!url.trim()) {
    return { valid: false, error: 'URL não pode estar vazia' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { valid: false, error: 'URL inválida' };
  }

  // Direct CDN / file URL — valid, no album parsing needed
  if (isCdnUrl(url) || isDirectFileUrl(url)) {
    return { valid: true, isDirect: true };
  }

  // Bunkr album or file page URL
  if (isBunkrUrl(url)) {
    const albumMatch = parsedUrl.pathname.match(/\/a\/([a-zA-Z0-9_-]+)/);
    if (albumMatch) {
      return { valid: true, isDirect: false };
    }
    // File page URLs (/f/, /v/, /d/) — also valid
    const fileMatch = parsedUrl.pathname.match(/\/[fvd]\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
      return { valid: true, isDirect: false };
    }
    return { valid: false, error: 'URL não parece ser um álbum ou arquivo Bunkr válido' };
  }

  return { valid: false, error: 'Domínio não reconhecido como Bunkr' };
}

const FETCH_TIMEOUT_MS = 10000;

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export async function fetchWithProxy(
  url: string,
  proxyUrl?: string,
  options?: RequestInit
): Promise<Response> {
  const effectiveProxy = shouldUseProxy(proxyUrl);
  const headers: Record<string, string> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...((options?.headers as Record<string, string>) || {}),
  };

  // On native platform: try direct first (no CORS needed), then proxy as fallback
  if (!effectiveProxy) {
    try {
      return await fetchWithTimeout(url, { ...options, headers });
    } catch { /* direct failed, try proxies as fallback */ }
    for (const proxy of DEFAULT_CORS_PROXIES) {
      try {
        const fetchUrl = getCorsProxyUrl(url, proxy);
        return await fetchWithTimeout(fetchUrl, { ...options, headers });
      } catch { /* try next */ }
    }
    throw new Error('Falha ao buscar conteúdo. Verifique sua conexão.');
  }

  // On web: try configured proxy first
  try {
    const fetchUrl = getCorsProxyUrl(url, effectiveProxy);
    const resp = await fetchWithTimeout(fetchUrl, { ...options, headers });
    // Any HTTP response proves the proxy request completed. Retrying the same
    // deterministic 4xx/5xx through several public proxies adds up to ~50s.
    return resp;
  } catch { /* fall through to fallbacks */ }

  // Fallback: try each DEFAULT_CORS_PROXIES
  for (const fallbackProxy of DEFAULT_CORS_PROXIES) {
    if (fallbackProxy === effectiveProxy) continue;
    try {
      const fetchUrl = getCorsProxyUrl(url, fallbackProxy);
      const resp = await fetchWithTimeout(fetchUrl, { ...options, headers });
      return resp;
    } catch { /* try next */ }
  }

  // Last resort: try direct
  try {
    const resp = await fetchWithTimeout(url, { ...options, headers });
    if (resp.ok || resp.status === 403) return resp;
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  } catch {
    throw new Error('Todos os proxies falharam. Verifique sua conexão.');
  }
}

export async function fetchAlbumHtml(url: string, proxyUrl?: string): Promise<string> {
  // Rewrite dead bunkr domains (bunkr.st -> bunkr.cr, etc.)
  const rewrittenUrl = rewriteBunkrDomain(url);
  const response = await fetchWithProxy(rewrittenUrl, proxyUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  const html = await response.text();
  // If the domain returned a parked page, try the canonical bunkr.cr
  if (isParkedPage(html) && rewrittenUrl === url) {
    const crUrl = rewriteBunkrDomain(url);
    if (crUrl !== url) {
      const fallback = await fetchWithProxy(crUrl, proxyUrl);
      if (fallback.ok) return fallback.text();
    }
  }
  return html;
}

export function extractItemPages(html: string, baseUrl: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseDomain = new URL(baseUrl).origin;
  const itemUrls: string[] = [];
  const seen = new Set<string>();

  const primaryLinks = doc.querySelectorAll('a[href^="/f/"], a[href^="/v/"], a[href^="/d/"]');
  primaryLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;
    if (!seen.has(fullUrl)) { seen.add(fullUrl); itemUrls.push(fullUrl); }
  });

  if (itemUrls.length === 0) {
    const gridLinks = doc.querySelectorAll(
      '.grid a[href*="/f/"], .grid a[href*="/v/"], ' +
      '[class*="grid"] a[href*="/f/"], [class*="grid"] a[href*="/v/"], ' +
      '.gallery a[href*="/f/"], .gallery a[href*="/v/"], ' +
      'a[href*="/f/"], a[href*="/v/"]'
    );
    gridLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;
      if (!seen.has(fullUrl)) { seen.add(fullUrl); itemUrls.push(fullUrl); }
    });
  }

  if (itemUrls.length === 0) {
    const allLinks = doc.querySelectorAll('a[href]');
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.match(/\/[fvd]\/[a-zA-Z0-9_-]+/)) {
        const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;
        if (!seen.has(fullUrl)) { seen.add(fullUrl); itemUrls.push(fullUrl); }
      }
    });
  }

  return itemUrls;
}

export function extractPageVars(html: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const regex = /var\s+(\w+)\s*=\s*(".*?"|'.*?'|[^;]+);/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function extractResolverInfo(html: string): { fileId: string; apiUrl: string } | null {
  // Current Bunkr pages expose the numeric id and the correct resolver host in
  // the primary download link: https://dl.bunkr.<tld>/file/<numeric-id>.
  const linkMatch = html.match(/https?:\/\/(dl\.bunkr\.[a-z0-9.-]+)\/file\/(\d+)/i);
  if (linkMatch) {
    return {
      fileId: linkMatch[2],
      apiUrl: `https://${linkMatch[1]}/api/_001_v2`,
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const downloadLink = doc.querySelector<HTMLAnchorElement>('a[href*="/file/"]');
  if (downloadLink?.href) {
    try {
      const parsed = new URL(downloadLink.href);
      const id = parsed.pathname.match(/\/file\/(\d+)/)?.[1];
      if (id && parsed.hostname.startsWith('dl.bunkr.')) {
        return { fileId: id, apiUrl: `${parsed.origin}/api/_001_v2` };
      }
    } catch { /* keep trying fallbacks */ }
  }

  const numericId = html.match(/data-(?:file-)?id=["'](\d+)["']/i)?.[1];
  if (numericId) return { fileId: numericId, apiUrl: DOWNLOAD_API };
  return null;
}

async function getDownloadUrl(fileId: string, apiUrl: string, proxyUrl?: string): Promise<any> {
  try {
    const response = await fetchWithProxy(apiUrl, proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Upstream-Referer': DOWNLOAD_REFERER,
      },
      body: JSON.stringify({ id: fileId }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getSignedUrl(mediaPath: string, proxyUrl?: string): Promise<{ token: string; ex: string } | null> {
  try {
    const response = await fetchWithProxy(
      `${BUNKR_API}?path=${encodeURIComponent(mediaPath)}`,
      proxyUrl
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function extractFilenameFromPage(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const h1 = doc.querySelector('h1');
  if (h1) { const text = h1.textContent?.trim(); if (text) return sanitizeFilename(text); }
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle) { const content = ogTitle.getAttribute('content'); if (content) return sanitizeFilename(content); }
  const title = doc.querySelector('title');
  if (title) { const text = title.textContent?.trim(); if (text) return sanitizeFilename(text); }
  return null;
}

function findDirectMediaUrl(html: string): string | null {
  const videoMatch = html.match(/<video[^>]*src="([^"]+)"/);
  if (videoMatch) return videoMatch[1];
  const sourceMatch = html.match(/<source[^>]*src="([^"]+)"/);
  if (sourceMatch) return sourceMatch[1];
  const imgMatch = html.match(/<img[^>]*data-src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  const cdnMatch = html.match(/(https?:\/\/[^\s"'<>]+\.(mp4|webm|mkv|avi|mov|jpg|jpeg|png|gif|webp))/i);
  if (cdnMatch) return cdnMatch[1];
  return null;
}

export function parseAlbumHtml(html: string, baseUrl?: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseDomain = baseUrl ? new URL(baseUrl).origin : 'https://bunkr.sk';

  const albumTitle = doc.querySelector('h1');
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const titleTag = doc.querySelector('title');
  const albumName = albumTitle?.textContent?.trim() ||
    ogTitle?.getAttribute('content') ||
    titleTag?.textContent?.trim() ||
    'Álbum sem título';

  const itemUrls = extractItemPages(html, baseUrl || baseDomain);

  const files: BunkrFile[] = itemUrls.map((url, index) => {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const slug = pathParts[pathParts.length - 1] || `file-${index}`;
    return {
      id: `file-${index}-${slug}`,
      name: `${slug}`,
      url,
      size: '-',
      type: '',
      isDirect: false,
    };
  });

  return { files, albumName };
}

export async function resolveAlbumFiles(
  albumUrl: string,
  proxyUrl?: string,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<BunkrFile[]> {
  const html = await fetchAlbumHtml(albumUrl, proxyUrl);
  const { files } = parseAlbumHtml(html, albumUrl);
  const resolved: BunkrFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    const resolvedInfo = await resolveFileUrl(file.url, proxyUrl);
    if (resolvedInfo) {
      resolved.push({ ...file, name: resolvedInfo.filename, url: resolvedInfo.url, isDirect: true });
    } else {
      resolved.push(file);
    }
    if (i < files.length - 1) await new Promise(r => setTimeout(r, 0));
  }

  return resolved;
}

/**
 * Resolve file URLs concurrently with a concurrency limit.
 * Much faster than sequential resolution for large albums.
 */
export async function resolveFilesConcurrently(
  files: BunkrFile[],
  proxyUrl?: string,
  concurrency: number = 12,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<BunkrFile[]> {
  const resolved = [...files];
  let completed = 0;
  const total = files.length;

  // Continuous worker pool: a slow request no longer blocks the next batch.
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), total);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= total) return;

      const file = files[index];
      try {
        const result = await resolveFileUrlCached(file.url, proxyUrl);
        if (result) {
          resolved[index] = {
            ...file,
            name: result.filename,
            url: result.url,
            type: getFileExtension(result.filename),
            isDirect: true,
          };
        }
      } finally {
        completed++;
        onProgress?.(completed, total, resolved[index]?.name || file.name);
      }
    }
  });

  await Promise.all(workers);

  return resolved;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 200) || 'unknown_file';
}

export function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
  return match ? match[1].toLowerCase() : '';
}

export function filterFiles(
  files: BunkrFile[],
  includeFilter: string,
  excludeFilter: string
): BunkrFile[] {
  const includeTerms = includeFilter.toLowerCase().split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
  const excludeTerms = excludeFilter.toLowerCase().split(/[,\s]+/).map(t => t.trim()).filter(Boolean);

  return files.filter(file => {
    const nameLower = file.name.toLowerCase();
    const typeLower = file.type.toLowerCase();
    const fullText = `${nameLower} ${typeLower}`;
    if (includeTerms.length > 0 && !includeTerms.some(term => fullText.includes(term))) return false;
    if (excludeTerms.length > 0 && excludeTerms.some(term => fullText.includes(term))) return false;
    return true;
  });
}

// Cache for resolved file URLs (in-memory during session)
const resolvedUrlCache = new Map<string, { url: string; filename: string } | null>();

async function resolveFileUrlCached(
  filePageUrl: string,
  proxyUrl?: string
): Promise<{ url: string; filename: string } | null> {
  if (resolvedUrlCache.has(filePageUrl)) return resolvedUrlCache.get(filePageUrl) ?? null;
  const result = await resolveFileUrl(filePageUrl, proxyUrl);
  resolvedUrlCache.set(filePageUrl, result);
  return result;
}

export async function resolveFileUrl(
  filePageUrl: string,
  proxyUrl?: string
): Promise<{ url: string; filename: string } | null> {
  try {
    // If it's already a direct CDN URL with token, return it directly
    const parsed = new URL(filePageUrl);
    if (parsed.pathname.includes('/storage/media/') && parsed.searchParams.has('token') && parsed.searchParams.has('ex')) {
      return { url: filePageUrl, filename: parsed.pathname.split('/').pop() || 'file' };
    }

    // Rewrite dead bunkr domains
    const rewrittenUrl = rewriteBunkrDomain(filePageUrl);
    const html = await fetchAlbumHtml(rewrittenUrl, proxyUrl);
    let filename = extractFilenameFromPage(html) || 'unknown';
    const pageVars = extractPageVars(html);
    const cdnUrl = pageVars.jsCDN;
    const resolver = extractResolverInfo(html);

    let unsignedUrl: string | undefined;
    if (resolver) {
      const downloadResponse = await getDownloadUrl(resolver.fileId, resolver.apiUrl, proxyUrl);
      if (downloadResponse?.mediafiles && downloadResponse?.path) {
        const parsed = new URL(downloadResponse.mediafiles);
        unsignedUrl = `${parsed.origin}${downloadResponse.path}`;
        if (downloadResponse.original) filename = sanitizeFilename(downloadResponse.original);
      }
    }

    // The metadata API is authoritative and may point to a different CDN
    // node than the stale jsCDN value embedded in the HTML page.
    let baseUrl = unsignedUrl || cdnUrl;
    if (!baseUrl) baseUrl = findDirectMediaUrl(html) || undefined;
    if (!baseUrl) return null;

    const absoluteBaseUrl = new URL(baseUrl, rewrittenUrl);
    const mediaPath = absoluteBaseUrl.pathname;

    const signed = await getSignedUrl(mediaPath, proxyUrl);
    if (signed?.token && signed?.ex) {
      absoluteBaseUrl.searchParams.set('token', signed.token);
      absoluteBaseUrl.searchParams.set('ex', signed.ex);
      absoluteBaseUrl.searchParams.set('n', filename);
      return { url: absoluteBaseUrl.toString(), filename };
    }

    // Unsigned CDN links fail with ERR_INVALID_RESPONSE/403. Do not mark the
    // file as downloadable unless the signer returned a valid token.
    return null;
  } catch {
    return null;
  }
}