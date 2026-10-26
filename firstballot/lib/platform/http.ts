import { NextResponse } from 'next/server'
export class PlatformError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
export function failure(error: unknown) {
  if (error instanceof PlatformError)
    return json({ error: error.message, code: error.code }, error.status)
  console.error(JSON.stringify({ event: 'platform_error', code: 'INTERNAL_ERROR' }))
  return json({ error: 'Service temporarily unavailable. Please retry.', code: 'UNAVAILABLE' }, 503)
}
export async function body(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 16000)
    throw new PlatformError(413, 'BODY_TOO_LARGE', 'Request too large.')
  const reader = request.body?.getReader(),
    parts: Uint8Array[] = []
  let size = 0
  if (reader) {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 16000) {
        await reader.cancel()
        throw new PlatformError(413, 'BODY_TOO_LARGE', 'Request too large.')
      }
      parts.push(value)
    }
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  const raw = new TextDecoder().decode(bytes)
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('INVALID_OBJECT')
    return parsed
  } catch {
    throw new PlatformError(400, 'INVALID_JSON', 'Invalid JSON.')
  }
}
