import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fail } from '../lib/platform/http.ts'

const root = new URL('..', import.meta.url).pathname

test('fail returns { error, code }, never cached, with any fields a client reads', async () => {
  const response = fail(409, 'This pick is already saved.', { voted: true })
  assert.equal(response.status, 409)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.deepEqual(await response.json(), {
    error: 'This pick is already saved.',
    code: 'CONFLICT',
    voted: true,
  })
  const stale = await fail(503, 'Current KTC values are unavailable.', {
    code: 'STALE_SOURCE',
  }).json()
  assert.equal(stale.code, 'STALE_SOURCE')
})

test('API routes build error bodies only through http.ts', async () => {
  const entries = await readdir(join(root, 'app/api'), { withFileTypes: true, recursive: true })
  const routes = entries
    .filter((e) => e.isFile() && e.name === 'route.ts')
    .map((e) => join(e.parentPath ?? e.path, e.name))
  assert.ok(routes.length > 30)
  for (const file of routes) {
    const source = await readFile(file, 'utf8')
    assert.doesNotMatch(
      source,
      /\b(NextResponse\.json|reply|json)\(\s*\{\s*error:/,
      `${file.slice(root.length)} builds its own error body; use fail() or failure()`
    )
    assert.doesNotMatch(
      source,
      /(details|message):\s*(error|err|e)(\s+instanceof\s+Error\s*\?\s*\w+)?\.message/,
      `${file.slice(root.length)} sends raw error text to the client`
    )
  }
})
