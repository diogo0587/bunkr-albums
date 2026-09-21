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
    const range = req.headers.range
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://get.bunkrr.su/',
        ...(range ? { Range: range } : {}),
      }
    })

    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Content-Type', contentType)

    const contentLength = response.headers.get('content-length')
    const contentRange = response.headers.get('content-range')
    const acceptRanges = response.headers.get('accept-ranges')
    if (contentLength) res.setHeader('Content-Length', contentLength)
    if (contentRange) res.setHeader('Content-Range', contentRange)
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges)

    if (req.query.download === '1') {
      const requestedName = Array.isArray(req.query.filename)
        ? req.query.filename[0]
        : req.query.filename
      const safeName = String(requestedName || 'download')
        .replace(/[\r\n"\\/]/g, '_')
        .slice(0, 200)
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
    }

    // Cache images for 1 hour
    if (contentType.startsWith('image/')) {
      res.setHeader('Cache-Control', 'public, max-age=3600')
    }

    // Stream instead of buffering the whole media file in the serverless
    // function. Large videos otherwise exhaust memory or hit response limits.
    res.status(response.status)
    if (!response.body) return res.end()

    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!res.write(Buffer.from(value))) {
        await new Promise(resolve => res.once('drain', resolve))
      }
    }
    return res.end()
  } catch (err) {
    return res.status(500).json({
      error: 'Proxy request failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}