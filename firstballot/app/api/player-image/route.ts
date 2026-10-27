import { isProxyableImage } from '@/lib/player-image'

export const runtime = 'nodejs'

const MAX_BYTES = 2_000_000

// NFL.com serves ~3.5 MB originals; cards render at a few hundred pixels.
const downsize = (url: string) =>
  url.replace('/image/upload/f_auto,q_auto/', '/image/upload/f_auto,q_auto,w_480/')
const HIT = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
const MISS = 'public, max-age=300, s-maxage=300'

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('u') ?? ''
  if (!isProxyableImage(target)) return new Response('Bad image URL', { status: 400 })
  try {
    const upstream = await fetch(downsize(target), { signal: AbortSignal.timeout(8000) })
    const type = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !type.startsWith('image/'))
      return new Response(null, { status: 404, headers: { 'Cache-Control': MISS } })
    const bytes = await upstream.arrayBuffer()
    if (bytes.byteLength > MAX_BYTES)
      return new Response(null, { status: 404, headers: { 'Cache-Control': MISS } })
    return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': HIT } })
  } catch {
    return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
