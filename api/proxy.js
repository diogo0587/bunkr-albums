export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    return res.status(204).end()
  }

  const target = req.query.url

  if (!target) {
    return res.status(400).json({ error: 'Missing url parameter' })
  }

  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      }
    })

    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Content-Type', contentType)

    // Cache images for 1 hour
    if (contentType.startsWith('image/')) {
      res.setHeader('Cache-Control', 'public, max-age=3600')
    }

    // Use arrayBuffer for binary content (images, video, etc.)
    const isBinary = contentType.startsWith('image/') ||
                     contentType.startsWith('video/') ||
                     contentType.startsWith('font/') ||
                     contentType.includes('octet-stream') ||
                     contentType.includes('pdf')

    if (isBinary) {
      const buffer = Buffer.from(await response.arrayBuffer())
      return res.status(response.status).send(buffer)
    }

    const body = await response.text()
    return res.status(response.status).send(body)
  } catch (err) {
    return res.status(500).json({
      error: 'Proxy request failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}
