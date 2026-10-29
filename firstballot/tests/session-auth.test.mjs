import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readSession, sessionHeaders, sessionUser } from '../lib/platform/session.ts'
import { isPublicApi } from '../lib/platform/policy.ts'

const root = new URL('..', import.meta.url).pathname

async function sourceFiles(dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true, recursive: true })
  return entries
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => join(e.parentPath ?? e.path, e.name).slice(root.length))
}

test('session headers round-trip, including a non-ASCII username', () => {
  const headers = sessionHeaders(
    { id: 'u1', email: 'a@b.co', user_metadata: { username: 'José' } },
    'jwt'
  )
  for (const value of Object.values(headers)) assert.match(value, /^[\x20-\x7e]*$/)
  const session = readSession(new Request('https://x.test/api/settings', { headers }))
  assert.deepEqual(session, { userId: 'u1', jwt: 'jwt', email: 'a@b.co', username: 'José' })
})

test('a request without a verified session has none', () => {
  const bare = new Request('https://x.test/api/settings', { headers: { 'x-user-id': 'u1' } })
  assert.equal(readSession(bare), null)
  assert.throws(() => sessionUser(bare), { status: 401, code: 'UNAUTHENTICATED' })
  const noEmail = sessionHeaders({ id: 'u1', email: null }, 'jwt')
  assert.deepEqual(Object.keys(noEmail), ['x-user-id', 'x-user-jwt'])
})

test('only middleware.ts verifies a session JWT', async () => {
  const files = [...(await sourceFiles('app')), ...(await sourceFiles('lib'))]
  for (const file of files) {
    const source = await readFile(join(root, file), 'utf8')
    assert.doesNotMatch(source, /auth\.getUser\(/, `${file} verifies the JWT again`)
  }
  assert.match(await readFile(join(root, 'middleware.ts'), 'utf8'), /auth\.getUser\(/)
})

test('routes that read the session sit behind middleware verification', async () => {
  const routes = (await sourceFiles('app/api')).filter((f) => f.endsWith('/route.ts'))
  for (const file of routes) {
    const source = await readFile(join(root, file), 'utf8')
    if (!/readSession|sessionUser|webAccount|x-user-(id|jwt)/.test(source)) continue
    const path = '/' + file.replace(/^app\//, '').replace(/\/route\.ts$/, '')
    assert.equal(isPublicApi(path), false, `${path} is public, so its session headers are empty`)
    assert.ok(!path.startsWith('/api/v1/') && path !== '/api/mcp', `${path} skips verification`)
  }
})

test('middleware strips identity headers before any early return', async () => {
  const source = await readFile(join(root, 'middleware.ts'), 'utf8')
  const strip = source.indexOf('headers.delete(name)')
  assert.ok(strip > 0 && strip < source.indexOf('return '), 'strip must precede every return')
  assert.match(source, /matcher: '\/api\/:path\*'/)
})
