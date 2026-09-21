const GITHUB_PAGES_PROXY = 'https://bunkr-albums-dsj.vercel.app/api/proxy?url=';
const GITHUB_PAGES_API = 'https://bunkr-albums-dsj.vercel.app/api';

/**
 * Vercel can use its same-origin serverless route. GitHub Pages is static, so
 * it must call the public Vercel proxy explicitly.
 */
export const APP_PROXY_URL =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
    ? GITHUB_PAGES_PROXY
    : '/api/proxy?url=';

export const APP_RESOLVE_URL =
  typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')
    ? `${GITHUB_PAGES_API}/resolve`
    : '/api/resolve';