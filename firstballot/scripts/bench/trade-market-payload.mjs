// Fetches /api/trade-market payloads by calling the route handler directly (no auth layer),
// for before/after comparisons. Needs the Supabase env from .env.local. Usage:
//   node --import tsx --import ./tests/helpers/register.mjs scripts/bench/trade-market-payload.mjs <outDir> <leagueId>...
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const [outDir, ...leagueIds] = process.argv.slice(2)
const { GET } = await import('../../app/api/trade-market/route.ts')
const { NextRequest } = await import('next/server')
for (const id of leagueIds) {
  const response = await GET(new NextRequest(`https://local.test/api/trade-market?leagueId=${id}`))
  const body = await response.json()
  await writeFile(join(outDir, `tm-${id}.json`), JSON.stringify(body))
  console.log(id, response.status, body.data?.totalTrades)
}
