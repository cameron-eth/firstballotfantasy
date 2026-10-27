const ALLOWED: Array<{ host: string; prefix: string }> = [
  { host: 'a.espncdn.com', prefix: '/i/headshots/nfl/players/' },
  { host: 'sleepercdn.com', prefix: '/content/nfl/players/' },
  { host: 'static.www.nfl.com', prefix: '/image/upload/' },
]

export function isProxyableImage(raw: string): boolean {
  try {
    const url = new URL(raw)
    return (
      url.protocol === 'https:' &&
      ALLOWED.some((rule) => url.hostname === rule.host && url.pathname.startsWith(rule.prefix))
    )
  } catch {
    return false
  }
}

/**
 * Headshots come from CDNs that answer every view with a conditional request (304).
 * Our proxy serves them with long-lived cache headers; `version` busts them on refresh.
 */
export function playerImageSrc(src: string, version = 0): string {
  if (!isProxyableImage(src)) return src
  return `/api/player-image?u=${encodeURIComponent(src)}&v=${version}`
}
