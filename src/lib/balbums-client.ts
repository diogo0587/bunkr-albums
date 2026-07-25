/**
 * Client for balbums.st — Bunkr Album Archive
 */

export interface BalbumsResult {
  albums: BalbumsAlbum[];
  totalPages: number;
  currentPage: number;
}

export interface BalbumsAlbum {
  id: string;
  url: string;
  name: string;
  fileCount: number;
  thumbnail?: string;
  date?: string;
}

export type SearchMode = 'broad' | 'exact';
export type SortMode = 'latest' | 'popular' | 'updated';
export type CategoryMode = 'all' | 'albums' | 'videos' | 'files' | 'images' | 'live';

const BASE_URL = 'https://balbums.st';

const FALLBACK_IMG_PATTERNS = [
  '/img/bunkr.svg',
  '/img/favicon',
  '/favicon',
  'data:image',
];

function isFallbackImage(src: string): boolean {
  return FALLBACK_IMG_PATTERNS.some(p => src.includes(p));
}

export function parseBalbumsHtml(html: string): BalbumsResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const albums: BalbumsAlbum[] = [];

  const allLinks = doc.querySelectorAll('a[href*="bunkr."][href*="/a/"]');

  allLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const url = href.startsWith('http') ? href : `https:${href}`;
    const idMatch = url.match(/\/a\/([a-zA-Z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : '';
    if (!id) return;

    const linkText = link.textContent || '';
    let name = '';
    let fileCount = 0;

    const lines = linkText.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === 'View album') continue;

      const countMatch = line.match(/^(\d+)\s+files?\s*→?\s*Open?$/i);
      if (countMatch) {
        fileCount = parseInt(countMatch[1], 10);
        continue;
      }

      const simpleCountMatch = line.match(/^(\d+)\s+files?$/i);
      if (simpleCountMatch) {
        fileCount = parseInt(simpleCountMatch[1], 10);
        continue;
      }

      if (line && line !== '→' && line !== 'Open') {
        name = line;
      }
    }

    if (!name) {
      const fullMatch = linkText.match(/View\s+album\s*\n?\s*([\s\S]*?)\n?\s*(\d+)\s+files/i);
      if (fullMatch) {
        name = fullMatch[1].trim();
        fileCount = parseInt(fullMatch[2], 10);
      }
    }

    if (!name) {
      name = linkText
        .replace(/View\s+album/gi, '')
        .replace(/\d+\s+files?/gi, '')
        .replace(/→\s*Open/gi, '')
        .replace(/→/g, '')
        .trim();
    }

    // Extract thumbnail — prefer thumb-img class, skip fallback logos
    let thumbnail = '';

    // 1. Try img with class thumb-img (the real thumbnail)
    const thumbImg = link.querySelector('img.thumb-img');
    if (thumbImg) {
      const src = thumbImg.getAttribute('src') || thumbImg.getAttribute('data-src');
      if (src && !isFallbackImage(src)) {
        thumbnail = src.startsWith('//') ? 'https:' + src : src;
      }
    }

    // 2. Try any img that isn't a fallback
    if (!thumbnail) {
      const imgs = link.querySelectorAll('img');
      for (const img of Array.from(imgs)) {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (src && !isFallbackImage(src) && !thumbnail) {
          thumbnail = src.startsWith('//') ? 'https:' + src : src;
        }
      }
    }

    // 3. Try background-image in child divs
    if (!thumbnail) {
      const allDivs = link.querySelectorAll('div');
      for (const div of Array.from(allDivs)) {
        const style = div.getAttribute('style') || '';
        if (style.includes('background-image') || style.includes('url(')) {
          const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
          if (bgMatch && !isFallbackImage(bgMatch[1])) {
            thumbnail = bgMatch[1];
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
            else if (thumbnail.startsWith('/')) thumbnail = 'https://balbums.st' + thumbnail;
            break;
          }
        }
      }
    }

    name = name.replace(/\s+/g, ' ').trim();

    if (name) {
      albums.push({ id, url, name, fileCount, thumbnail });
    }
  });

  let totalPages = 1;
  let currentPage = 1;

  const pageText = doc.body?.textContent || '';
  const pageMatch = pageText.match(/page\s+(\d+)\s+of\s+([\d,.]+)/i);
  if (pageMatch) {
    currentPage = parseInt(pageMatch[1], 10);
    totalPages = parseInt(pageMatch[2].replace(/,/g, ''), 10);
  }

  return { albums, totalPages, currentPage };
}

export function buildSearchUrl(
  query: string,
  options: {
    mode?: SearchMode;
    perPage?: number;
    sort?: SortMode;
    page?: number;
    category?: CategoryMode;
  } = {}
): string {
  const { mode = 'broad', perPage = 20, sort = 'latest', page = 1, category = 'all' } = options;

  const categoryPaths: Record<CategoryMode, string> = {
    all: '',
    albums: '/topalbums',
    videos: '/topvideos',
    files: '/topfiles',
    images: '/topimages',
    live: '/live',
  };

  const path = categoryPaths[category] || '';
  const params = new URLSearchParams();
  if (query.trim()) params.set('search', query.trim());
  params.set('mode', mode);
  params.set('per', String(perPage));
  params.set('sort', sort);
  if (page > 1) params.set('page', String(page));

  const queryString = params.toString();
  return `${BASE_URL}${path}${queryString ? '?' + queryString : ''}`;
}

export async function searchBalbums(
  query: string,
  options: {
    mode?: SearchMode;
    perPage?: number;
    sort?: SortMode;
    page?: number;
    category?: CategoryMode;
    proxyUrl?: string;
  } = {}
): Promise<BalbumsResult> {
  const { proxyUrl, ...searchOptions } = options;
  const searchUrl = buildSearchUrl(query, searchOptions);

  let fetchUrl: string;
  if (proxyUrl) {
    const proxy = proxyUrl.replace(/\/$/, '');
    if (proxy.includes('allorigins')) {
      fetchUrl = `${proxy}${encodeURIComponent(searchUrl)}`;
    } else if (proxy.includes('?')) {
      fetchUrl = `${proxy}${encodeURIComponent(searchUrl)}`;
    } else {
      fetchUrl = `${proxy}/${searchUrl}`;
    }
  } else {
    fetchUrl = searchUrl;
  }

  const response = await fetch(fetchUrl, {
    headers: { 'Accept': 'text/html,*/*' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return parseBalbumsHtml(html);
}
