/**
 * Client for balbums.st — Bunkr Album Archive
 * 
 * Endpoints:
 * - Search: https://balbums.st/?search=QUERY&mode=broad|exact&per=N&sort=latest|popular&page=N
 * - Live: https://balbums.st/live
 * - Top Albums: https://balbums.st/topalbums
 * - Top Videos: https://balbums.st/topvideos
 * - Top Files: https://balbums.st/topfiles
 * - Top Images: https://balbums.st/topimages
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

/**
 * Parse HTML from balbums.st search results.
 * 
 * The balbums.st HTML structure:
 * Each album is wrapped in an <a> tag linking to bunkr.cr/a/XXXX.
 * Inside: multiple <div>s - first ones are thumbnails (with background-image),
 * followed by a "View album" div, then the album name, then "N files → Open".
 */
export function parseBalbumsHtml(html: string): BalbumsResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const albums: BalbumsAlbum[] = [];

  // Find all album links - these are <a> tags linking to bunkr.*/a/*
  const allLinks = doc.querySelectorAll('a[href*="bunkr."][href*="/a/"]');
  
  allLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const url = href.startsWith('http') ? href : `https:${href}`;
    
    // Extract ID from URL
    const idMatch = url.match(/\/a\/([a-zA-Z0-9_-]+)/);
    const id = idMatch ? idMatch[1] : '';
    if (!id) return;

    // Get all the text content and structure from within the link
    const linkText = link.textContent || '';
    
    // Parse album name and file count from the text
    // Format: "Album Name\nN files\n→ Open" or "Album Name N files → Open"
    let name = '';
    let fileCount = 0;

    // Try to find "View album" text - everything before the file count is the name
    const lines = linkText.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip "View album" line
      if (line === 'View album') continue;
      
      // Check for "N files → Open" pattern
      const countMatch = line.match(/^(\d+)\s+files\s*→?\s*Open?$/i);
      if (countMatch) {
        fileCount = parseInt(countMatch[1], 10);
        continue;
      }
      
      // Check for just "N files" 
      const simpleCountMatch = line.match(/^(\d+)\s+files?$/i);
      if (simpleCountMatch) {
        fileCount = parseInt(simpleCountMatch[1], 10);
        continue;
      }
      
      // Everything else is part of the name
      if (line && line !== '→' && line !== 'Open') {
        name = line;
      }
    }

    // If we couldn't parse line by line, try regex on full text
    if (!name) {
      const fullMatch = linkText.match(/View\s+album\s*\n?\s*([\s\S]*?)\n?\s*(\d+)\s+files/i);
      if (fullMatch) {
        name = fullMatch[1].trim();
        fileCount = parseInt(fullMatch[2], 10);
      }
    }

    // Last resort: just use all text except known patterns
    if (!name) {
      name = linkText
        .replace(/View\s+album/gi, '')
        .replace(/\d+\s+files?/gi, '')
        .replace(/→\s*Open/gi, '')
        .replace(/→/g, '')
        .trim();
    }

    // Extract thumbnail - look for background-image in style attribute on divs
    let thumbnail = '';
    
    // Check for divs with background-image style
    const thumbDivs = link.querySelectorAll('div[style*="background"]');
    thumbDivs.forEach((div) => {
      const style = div.getAttribute('style') || '';
      const bgMatch = style.match(/background-image:\s*url\(["']?(.*?)["']?\)/i);
      if (bgMatch && !thumbnail) {
        thumbnail = bgMatch[1];
        if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
        else if (thumbnail.startsWith('/')) thumbnail = 'https://balbums.st' + thumbnail;
      }
    });

    // Also check for img tags (might be lazy-loaded)
    if (!thumbnail) {
      const imgs = link.querySelectorAll('img');
      imgs.forEach((img) => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (src && !thumbnail) {
          thumbnail = src;
          if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
          else if (thumbnail.startsWith('/')) thumbnail = 'https://balbums.st' + thumbnail;
        }
      });
    }

    // Try to find thumbnail from any child element with background style
    if (!thumbnail) {
      const allDivs = link.querySelectorAll('div');
      for (const div of Array.from(allDivs)) {
        const style = div.getAttribute('style') || '';
        if (style.includes('background') && style.includes('url')) {
          const bgMatch = style.match(/url\(["']?(.*?)["']?\)/);
          if (bgMatch) {
            thumbnail = bgMatch[1];
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
            else if (thumbnail.startsWith('/')) thumbnail = 'https://balbums.st' + thumbnail;
            break;
          }
        }
      }
    }

    // Clean up name
    name = name.replace(/\s+/g, ' ').trim();

    if (name) {
      albums.push({ id, url, name, fileCount, thumbnail });
    }
  });

  // Extract pagination info
  let totalPages = 1;
  let currentPage = 1;

  // Look for "page X of Y" text in the page
  const pageText = doc.body.textContent || '';
  const pageMatch = pageText.match(/page\s+(\d+)\s+of\s+(\d+)/i);
  if (pageMatch) {
    currentPage = parseInt(pageMatch[1], 10);
    totalPages = parseInt(pageMatch[2], 10);
  }

  return { albums, totalPages, currentPage };
}

/**
 * Build search URL for balbums.st
 */
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

  // Category-specific paths
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
  if (query.trim()) {
    params.set('search', query.trim());
  }
  params.set('mode', mode);
  params.set('per', String(perPage));
  params.set('sort', sort);
  if (page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return `${BASE_URL}${path}${queryString ? '?' + queryString : ''}`;
}

/**
 * Search albums on balbums.st via proxy
 */
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
  
  // Fetch via proxy
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
    headers: {
      'Accept': 'text/html,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return parseBalbumsHtml(html);
}
