const SIGN_API = 'https://glb-apisign.cdn.cr/sign'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function fetchWithTimeout(url, init = {}, timeout = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function sanitizeFilename(name) {
  return String(name || 'download')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200) || 'download'
}

function pageFilename(html) {
  return sanitizeFilename(
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ||
    html.match(/<h1[^>]*>([^<]+)/i)?.[1] ||
    html.match(/<title[^>]*>([^<]+)/i)?.[1] ||
    'download'
  )
}

function resolverInfo(html) {
  const match = html.match(/https?:\/\/(dl\.bunkr\.[a-z0-9.-]+)\/file\/(\d+)/i)
  if (match) return { id: match[2], api: `https://${match[1]}/api/_001_v2` }
  const id = html.match(/data-(?:file-)?id=["'](\d+)["']/i)?.[1]
  return id ? { id, api: 'https://dl.bunkr.cr/api/_001_v2' } : null
}

async function resolveOne(pageUrl) {
  try {
    const parsedPage = new URL(pageUrl)
    if (!parsedPage.hostname.includes('bunkr.')) throw new Error('Unsupported host')

    const page = await fetchWithTimeout(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,*/*' },
    })
    if (!page.ok) throw new Error(`Page HTTP ${page.status}`)
    const html = await page.text()
    const resolver = resolverInfo(html)
    if (!resolver) throw new Error('Numeric file id not found')

    const metadataResponse = await fetchWithTimeout(resolver.api, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://get.bunkrr.su/',
      },
      body: JSON.stringify({ id: String(resolver.id) }),
    })
    if (!metadataResponse.ok) throw new Error(`Metadata HTTP ${metadataResponse.status}`)
    const metadata = await metadataResponse.json()
    if (!metadata.mediafiles || !metadata.path) throw new Error('Invalid metadata')

    const rawUrl = new URL(metadata.path, metadata.mediafiles)
    const signResponse = await fetchWithTimeout(
      `${SIGN_API}?path=${encodeURIComponent(rawUrl.pathname)}`,
      { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' } }
    )
    if (!signResponse.ok) throw new Error(`Signer HTTP ${signResponse.status}`)
    const signed = await signResponse.json()
    if (!signed.token || !signed.ex) throw new Error('Invalid signature')

    const filename = sanitizeFilename(metadata.original || pageFilename(html))
    rawUrl.searchParams.set('n', filename)
    rawUrl.searchParams.set('token', String(signed.token))
    rawUrl.searchParams.set('ex', String(signed.ex))
    return { pageUrl, url: rawUrl.toString(), filename }
  } catch (error) {
    return { pageUrl, url: null, error: error instanceof Error ? error.message : 'Resolve failed' }
  }
}

async function resolvePool(urls, concurrency = 20) {
  const results = new Array(urls.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= urls.length) return
      results[index] = await resolveOne(urls[index])
    }
  })
  await Promise.all(workers)
  return results
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 100) : []
  if (!urls.length) return res.status(400).json({ error: 'urls must be a non-empty array' })

  const results = await resolvePool(urls)
  return res.status(200).json({ results })
}