import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname

async function sources() {
  const files = []
  for (const dir of ['app', 'lib', 'components', 'hooks']) {
    const entries = await readdir(join(root, dir), { withFileTypes: true, recursive: true })
    for (const e of entries)
      if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) files.push(join(e.parentPath ?? e.path, e.name))
  }
  return Promise.all(files.map(async (f) => [f.slice(root.length), await readFile(f, 'utf8')]))
}

test("only lib/platform/ktc-days.ts decides today's KTC day", async () => {
  for (const [file, source] of await sources()) {
    if (file === 'lib/platform/ktc-days.ts') continue
    assert.doesNotMatch(
      source,
      /\.select\('scraped_date'\)\s*\.order\('scraped_date', \{ ascending: false \}\)/,
      `${file} finds the newest KTC date itself; use latestKtcDay()`
    )
    assert.doesNotMatch(
      source,
      /like\('dataset', `\$\{KTC_DAY_MARKER_PREFIX\}/,
      `${file} reads KTC day markers itself`
    )
  }
})

test('the refresh secret is checked in one place', async () => {
  for (const [file, source] of await sources())
    if (file !== 'lib/platform/auth.ts')
      assert.doesNotMatch(source, /DATA_REFRESH_SECRET/, `${file} checks the refresh secret itself`)
})

test('Sleeper reads take their cache settings from SLEEPER_CACHE', async () => {
  for (const [file, source] of await sources())
    if (file !== 'lib/sleeper-sdk/client.ts')
      assert.doesNotMatch(
        source,
        /next:\s*\{\s*revalidate:\s*\d/,
        `${file} sets an ad hoc fetch TTL`
      )
})
