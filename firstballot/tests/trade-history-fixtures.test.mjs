import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

const dir = new URL('./fixtures/trade-history/', import.meta.url)

async function fixtures() {
  const names = (await readdir(dir)).filter((f) => f.endsWith('.json.gz'))
  return Promise.all(
    names.map(async (name) => [name, gunzipSync(await readFile(new URL(name, dir))).toString()])
  )
}

test('trade-history fixtures cover SF dynasty, 1QB dynasty and redraft', async () => {
  const kinds = new Set()
  for (const [name, raw] of await fixtures()) {
    const f = JSON.parse(raw)
    kinds.add(`${f.format} ${f.type}`)
    assert.ok(f.trades.length > 0, `${name} has no trades`)
    for (const t of f.trades) {
      assert.match(t.id, /^t\d+$/)
      if (!t.ktc) continue
      assert.match(t.ktc.day, /^\d{4}-\d{2}-\d{2}$/)
      for (const [asset, values] of Object.entries(t.ktc.values)) {
        assert.match(asset, /^(ktc:\d+|pick:\d{4} Mid (1st|2nd|3rd|4th))$/)
        assert.equal(values.length, 2, `${name} ${asset} needs SF and 1QB values`)
      }
    }
  }
  assert.deepEqual([...kinds].sort(), ['1qb dynasty', '1qb redraft', 'sf dynasty'])
})

test('trade-history fixtures carry no Sleeper user or league ids', async () => {
  for (const [name, raw] of await fixtures()) {
    assert.doesNotMatch(raw, /\d{15,}/, `${name} contains a long Sleeper id`)
    for (const season of JSON.parse(raw).seasons)
      for (const owner of Object.values(season.owners))
        assert.ok(owner === null || /^m\d+$/.test(owner), `${name} owner ${owner} is not an alias`)
  }
})
