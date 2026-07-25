import { shouldUseProxy } from './capacitor-native';

import type { BunkrFile } from '@/types';
import { isBunkrUrl, isCdnUrl, isDirectFileUrl } from './bunkr-hosts';

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
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

export function getCorsProxyUrl(targetUrl: string, proxyUrl?: string): string {
  if (!proxyUrl) return targetUrl;
  const proxy = proxyUrl.replace(/\/$/, '');
  if (proxy.includes('allorigins')) return `${proxy}${encodeURIComponent(targetUrl)}`;
  if (proxy.includes('?')) return `${proxy}${encodeURIComponent(targetUrl)}`;
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

export async function fetchWithProxy(
  url: string,
  proxyUrl?: string,
  options?: RequestInit
): Promise<Response> {
  const effectiveProxy = shouldUseProxy(proxyUrl);
  const fetchUrl = getCorsProxyUrl(url, effectiveProxy);
  const headers: Record<string, string> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...((options?.headers as Record<string, string>) || {}),
  };
  return fetch(fetchUrl, { ...options, headers });
}

export async function fetchAlbumHtml(url: string, proxyUrl?: string): Promise<string> {
  const response = await fetchWithProxy(url, proxyUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.text();
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

function extractFileId(html: string): string | null {
  const match = html.match(/data-id="([a-zA-Z0-9_-]+)"/);
  if (match) return match[1];
  const match2 = html.match(/\/f\/([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  const match3 = html.match(/\/v\/([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];
  return null;
}

async function getDownloadUrl(fileId: string, proxyUrl?: string): Promise<any> {
  try {
    const response = await fetchWithProxy(`${DOWNLOAD_API}?fileId=${fileId}`, proxyUrl);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function getSignedUrl(mediaPath: string, proxyUrl?: string): Promise<{ token: string; ex: string } | null> {
  try {
    const response = await fetchWithProxy(
      `${BUNKR_API}?mediaPath=${encodeURIComponent(mediaPath)}`,
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
    if (i < files.length - 1) await new Promise(r => setTimeout(r, 500));
  }

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

export async function resolveFileUrl(
  filePageUrl: string,
  proxyUrl?: string
): Promise<{ url: string; filename: string } | null> {
  try {
    const html = await fetchAlbumHtml(filePageUrl, proxyUrl);
    const filename = extractFilenameFromPage(html) || 'unknown';
    const pageVars = extractPageVars(html);
    const cdnUrl = pageVars.jsCDN;
    const fileId = extractFileId(html);

    let unsignedUrl: string | undefined;
    if (fileId) {
      const downloadResponse = await getDownloadUrl(fileId, proxyUrl);
      if (downloadResponse?.mediafiles && downloadResponse?.path) {
        const parsed = new URL(downloadResponse.mediafiles);
        unsignedUrl = `${parsed.origin}${downloadResponse.path}`;
      }
    }

    let mediaPath: string;
    if (cdnUrl) {
      mediaPath = new URL(cdnUrl).pathname;
    } else if (unsignedUrl) {
      mediaPath = new URL(unsignedUrl).pathname;
    } else {
      const directUrl = findDirectMediaUrl(html);
      if (directUrl) return { url: directUrl, filename };
      return null;
    }

    const signed = await getSignedUrl(mediaPath, proxyUrl);
    if (signed?.token && signed?.ex) {
      const baseUrl = cdnUrl || unsignedUrl!;
      return { url: `${baseUrl}?token=${signed.token}&ex=${signed.ex}`, filename };
    }

    if (unsignedUrl) return { url: unsignedUrl, filename };
    if (cdnUrl) return { url: cdnUrl, filename };
    return null;
  } catch {
    return null;
  }
}
