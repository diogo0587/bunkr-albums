import type { BunkrFile } from '@/types';
import { isBunkrUrl } from './bunkr-hosts';

// Bunkr API endpoints (from BunkrDownloader Python project)
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

// Default CORS proxies
export const DEFAULT_CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

export function getCorsProxyUrl(targetUrl: string, proxyUrl?: string): string {
  if (!proxyUrl) return targetUrl;
  const proxy = proxyUrl.replace(/\/$/, '');
  if (proxy.includes('allorigins')) {
    return `${proxy}${encodeURIComponent(targetUrl)}`;
  }
  if (proxy.includes('?')) {
    return `${proxy}${encodeURIComponent(targetUrl)}`;
  }
  return `${proxy}/${targetUrl}`;
}

export function validateBunkrUrl(url: string): { valid: boolean; error?: string } {
  if (!url.trim()) {
    return { valid: false, error: 'URL não pode estar vazia' };
  }
  
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { valid: false, error: 'URL inválida' };
  }

  if (!isBunkrUrl(url)) {
    return { valid: false, error: 'Domínio não reconhecido como Bunkr' };
  }

  const albumMatch = parsedUrl.pathname.match(/\/a\/([a-zA-Z0-9_-]+)/);
  if (!albumMatch) {
    return { valid: false, error: 'URL não parece ser um álbum Bunkr válido (/a/XXXX)' };
  }

  return { valid: true };
}

export async function fetchWithProxy(
  url: string, 
  proxyUrl?: string, 
  options?: RequestInit
): Promise<Response> {
  const fetchUrl = getCorsProxyUrl(url, proxyUrl);
  
  const headers: Record<string, string> = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...((options?.headers as Record<string, string>) || {}),
  };

  return fetch(fetchUrl, {
    ...options,
    headers,
  });
}

export async function fetchAlbumHtml(url: string, proxyUrl?: string): Promise<string> {
  const response = await fetchWithProxy(url, proxyUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract item page URLs from the album page.
 * Bunkr album pages contain links to individual file pages.
 */
export function extractItemPages(html: string, baseUrl: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseDomain = new URL(baseUrl).origin;
  
  const itemUrls: string[] = [];
  const seen = new Set<string>();

  // Primary: Bunkr uses links with class "after:absolute after:z-10 after:inset-0"
  // These are overlay links on each grid item
  const primaryLinks = doc.querySelectorAll('a[href^="/f/"], a[href^="/v/"], a[href^="/d/"]');
  primaryLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    
    const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;
    if (!seen.has(fullUrl)) {
      seen.add(fullUrl);
      itemUrls.push(fullUrl);
    }
  });

  // Secondary: Look for any links inside grid items
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
      if (!seen.has(fullUrl)) {
        seen.add(fullUrl);
        itemUrls.push(fullUrl);
      }
    });
  }

  // Third: Look for links in anchor tags within media containers
  if (itemUrls.length === 0) {
    const allLinks = doc.querySelectorAll('a[href]');
    allLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href) return;
      // Match file page patterns: /f/XXXX, /v/XXXX, /d/XXXX
      if (href.match(/\/[fvd]\/[a-zA-Z0-9_-]+/)) {
        const fullUrl = href.startsWith('http') ? href : `${baseDomain}${href}`;
        if (!seen.has(fullUrl)) {
          seen.add(fullUrl);
          itemUrls.push(fullUrl);
        }
      }
    });
  }

  return itemUrls;
}

/**
 * Parse JS variables from inline scripts on the file page
 * Looks for: var jsCDN = "...";
 */
export function extractPageVars(html: string): Record<string, string> {
  const vars: Record<string, string> = {};
  
  // Match var declarations: var name = value;
  const regex = /var\s+(\w+)\s*=\s*(".*?"|'.*?'|[^;]+);/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const key = match[1];
    let value = match[2].trim();
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Unescape JS paths: \/ → /
    value = value.replace(/\\\//g, '/').replace(/\\\\/g, '\\');
    vars[key] = value;
  }
  
  return vars;
}

/**
 * Extract file ID from the HTML
 * Looks for: <script data-file-id="...">
 */
export function extractFileId(html: string): string | null {
  const match = html.match(/<script[^>]*data-file-id="([^"]*)"/);
  if (match) return match[1];
  
  // Alternative: look in script content
  const match2 = html.match(/["']fileId["']\s*:\s*["']([^"']+)["']/);
  if (match2) return match2[1];
  
  // Alternative: look for id in URLs
  const match3 = html.match(/\/f\/([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];
  
  return null;
}

/**
 * Get download URL from the Bunkr download API
 * POST to DOWNLOAD_API with {id: fileId}
 */
export async function getDownloadUrl(
  fileId: string,
  proxyUrl?: string
): Promise<{ mediafiles?: string; path?: string } | null> {
  try {
    const fetchUrl = getCorsProxyUrl(DOWNLOAD_API, proxyUrl);
    
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': DOWNLOAD_REFERER,
      },
      body: JSON.stringify({ id: fileId }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      mediafiles: data.mediafiles,
      path: data.path,
    };
  } catch {
    return null;
  }
}

/**
 * Get signed URL from the Bunkr signing API
 * GET to BUNKR_API?path=MEDIA_PATH
 */
export async function getSignedUrl(
  mediaPath: string,
  proxyUrl?: string
): Promise<{ token?: string; ex?: string } | null> {
  try {
    const url = `${BUNKR_API}?path=${encodeURIComponent(mediaPath)}`;
    const fetchUrl = getCorsProxyUrl(url, proxyUrl);
    
    const response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'application/json',
        'Referer': DOWNLOAD_REFERER,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Resolve a file page to get the actual download URL
 * This follows the same logic as BunkrDownloader Python:
 * 1. Extract page vars (jsCDN) and file_id from HTML
 * 2. If no jsCDN, call download API to get unsigned URL
 * 3. Call signing API to get signed URL with token
 */
export async function resolveFileUrl(
  filePageUrl: string,
  proxyUrl?: string
): Promise<{ url: string; filename: string } | null> {
  try {
    // Fetch the file page HTML
    const html = await fetchAlbumHtml(filePageUrl, proxyUrl);
    
    // Extract filename from the page
    const filename = extractFilenameFromPage(html) || 'unknown';
    
    // Extract JS variables (jsCDN)
    const pageVars = extractPageVars(html);
    const cdnUrl = pageVars.jsCDN;
    
    // Extract file ID
    const fileId = extractFileId(html);
    
    // Try the download API pipeline
    let unsignedUrl: string | undefined;
    
    if (fileId) {
      const downloadResponse = await getDownloadUrl(fileId, proxyUrl);
      if (downloadResponse?.mediafiles && downloadResponse?.path) {
        const parsed = new URL(downloadResponse.mediafiles);
        unsignedUrl = `${parsed.origin}${downloadResponse.path}`;
      }
    }
    
    // Determine the media path for signing
    let mediaPath: string;
    if (cdnUrl) {
      // Use CDN path
      const parsed = new URL(cdnUrl);
      mediaPath = parsed.pathname;
    } else if (unsignedUrl) {
      // Use the path from download API
      const parsed = new URL(unsignedUrl);
      mediaPath = parsed.pathname;
    } else {
      // Fallback: try to find direct media in the HTML
      const directUrl = findDirectMediaUrl(html);
      if (directUrl) {
        return { url: directUrl, filename };
      }
      return null;
    }
    
    // Get signed URL
    const signed = await getSignedUrl(mediaPath, proxyUrl);
    if (signed?.token && signed?.ex) {
      const baseUrl = cdnUrl || unsignedUrl!;
      const finalUrl = `${baseUrl}?token=${signed.token}&ex=${signed.ex}`;
      return { url: finalUrl, filename };
    }
    
    // If signing failed, return the unsigned URL as fallback
    if (unsignedUrl) {
      return { url: unsignedUrl, filename };
    }
    if (cdnUrl) {
      return { url: cdnUrl, filename };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract filename from the file page HTML
 */
function extractFilenameFromPage(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Look for h1 with file name
  const h1 = doc.querySelector('h1');
  if (h1) {
    const text = h1.textContent?.trim();
    if (text) return sanitizeFilename(text);
  }
  
  // Look for og:title
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const content = ogTitle.getAttribute('content');
    if (content) return sanitizeFilename(content);
  }
  
  // Look for title tag
  const title = doc.querySelector('title');
  if (title) {
    const text = title.textContent?.trim();
    if (text) return sanitizeFilename(text);
  }
  
  return null;
}

/**
 * Find direct media URL in HTML (fallback)
 */
function findDirectMediaUrl(html: string): string | null {
  // Look for video sources
  const videoMatch = html.match(/<video[^>]*src="([^"]+)"/);
  if (videoMatch) return videoMatch[1];
  
  const sourceMatch = html.match(/<source[^>]*src="([^"]+)"/);
  if (sourceMatch) return sourceMatch[1];
  
  // Look for data-src on images
  const imgMatch = html.match(/<img[^>]*data-src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  
  // Look for direct CDN URLs
  const cdnMatch = html.match(/(https?:\/\/[^\s"'<>]+\.(mp4|webm|mkv|avi|mov|jpg|jpeg|png|gif|webp))/i);
  if (cdnMatch) return cdnMatch[1];
  
  return null;
}

/**
 * Parse album HTML to extract file listing
 * For Bunkr, we extract the file page URLs, not direct download URLs
 */
export function parseAlbumHtml(html: string, baseUrl?: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const baseDomain = baseUrl ? new URL(baseUrl).origin : 'https://bunkr.sk';

  // Get album name
  const albumTitle = doc.querySelector('h1');
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const titleTag = doc.querySelector('title');
  const albumName = albumTitle?.textContent?.trim() || 
                    ogTitle?.getAttribute('content') || 
                    titleTag?.textContent?.trim() ||
                    'Álbum sem título';

  // Extract item page URLs
  const itemUrls = extractItemPages(html, baseUrl || baseDomain);
  
  // Convert to BunkrFile objects (these are page URLs, not direct download URLs)
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
      isDirect: false, // These are page URLs, needs resolution
    };
  });

  return { files, albumName };
}

/**
 * Full album resolution: parse album + resolve each file URL
 */
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
      resolved.push({
        ...file,
        name: resolvedInfo.filename,
        url: resolvedInfo.url,
        isDirect: true,
      });
    } else {
      // Keep the page URL if resolution failed
      resolved.push(file);
    }
    
    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return resolved;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200) || 'unknown_file';
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
  const includeTerms = includeFilter
    .toLowerCase()
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(Boolean);
  
  const excludeTerms = excludeFilter
    .toLowerCase()
    .split(/[,\s]+/)
    .map(t => t.trim())
    .filter(Boolean);

  return files.filter(file => {
    const nameLower = file.name.toLowerCase();
    const typeLower = file.type.toLowerCase();
    const fullText = `${nameLower} ${typeLower}`;

    if (includeTerms.length > 0) {
      const matchesInclude = includeTerms.some(term => fullText.includes(term));
      if (!matchesInclude) return false;
    }

    if (excludeTerms.length > 0) {
      const matchesExclude = excludeTerms.some(term => fullText.includes(term));
      if (matchesExclude) return false;
    }

    return true;
  });
}
