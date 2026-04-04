import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

function walk(relativeDir) {
  const absoluteDir = path.join(projectRoot, relativeDir)
  const results = []

  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') {
      continue
    }

    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(relativePath))
      continue
    }

    results.push(relativePath)
  }

  return results
}

function countInterfaceProperties(source, interfaceName) {
  const match = source.match(new RegExp(`interface\\s+${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))
  assert.ok(match, `Could not find interface ${interfaceName}`)

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && /:\s*[^=]/.test(line)).length
}

test('auth guard: Supabase config is env-backed with no embedded secrets', () => {
  const files = [
    'lib/supabase.ts',
    'lib/supabase-server.ts',
    'app/api/user-profile/route.ts',
  ]

  for (const relativePath of files) {
    const source = readProjectFile(relativePath)
    assert.doesNotMatch(source, /https:\/\/[a-z0-9-]+\.supabase\.co/i, `${relativePath} should not embed a Supabase URL`)
    assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}/, `${relativePath} should not embed a JWT`)
  }

  const clientSource = readProjectFile('lib/supabase.ts')
  const serverSource = readProjectFile('lib/supabase-server.ts')
  assert.match(clientSource, /getSupabaseUrl\(\)/)
  assert.match(clientSource, /getSupabaseAnonKey\(\)/)
  assert.match(serverSource, /getSupabaseServiceRoleKey\(\)/)
})

test('auth guard: user profile mutations require authenticated headers', () => {
  const source = readProjectFile('app/api/user-profile/route.ts')

  assert.match(source, /const authId = request\.headers\.get\('x-user-id'\)/)
  assert.match(source, /const userJwt = request\.headers\.get\('x-user-jwt'\)/)
  assert.match(source, /if \(!authId \|\| !userJwt\)/)
  assert.match(source, /User not authenticated/)
  assert.doesNotMatch(source, /createClient\(/, 'user-profile route should not fall back to an inline client')
})

test('prop drilling guard: overview header and sidebar prop surfaces stay compact', () => {
  const overviewHeader = readProjectFile('components/league-buddy/OverviewHeader.tsx')
  const sidebar = readProjectFile('components/league-buddy/LeagueBuddySidebar.tsx')

  assert.match(overviewHeader, /actions:\s*OverviewActions/)
  assert.doesNotMatch(overviewHeader, /onTradeMarketClick:\s*\(\)\s*=>\s*void/)
  assert.doesNotMatch(overviewHeader, /onScoutingPortalClick:\s*\(\)\s*=>\s*void/)
  assert.ok(
    countInterfaceProperties(overviewHeader, 'OverviewHeaderProps') <= 7,
    'OverviewHeaderProps should stay grouped and compact'
  )

  assert.doesNotMatch(sidebar, /\bleagues:\s*/)
  assert.doesNotMatch(sidebar, /\bleagueId:\s*string/)
  assert.doesNotMatch(sidebar, /\bonLeagueChange\?:/)
  assert.ok(
    countInterfaceProperties(sidebar, 'LeagueBuddySidebarProps') <= 6,
    'LeagueBuddySidebarProps should stay compact'
  )
})

test('file size guard: only approved legacy files may exceed the default budget', () => {
  const defaultBudget = 650
  const legacyBudgets = new Map([
    ['app/draft-board/page.tsx', 720],
    ['app/trade-market/page.tsx', 1550],
    ['components/DraftAnalysis.tsx', 980],
    ['components/LeagueBuddy.tsx', 1480],
    ['components/TeamValueGraph.tsx', 1140],
    ['components/landing/LandingPage.tsx', 760],
    ['components/scouting/DraftBoardTab.tsx', 1500],
    ['components/scouting/ProspectCharts.tsx', 820],
    ['components/scouting/ProspectComparison.tsx', 800],
    ['components/scouting/ScoutingPortal.tsx', 920],
    ['components/ui/sidebar.tsx', 760],
    ['components/league-buddy/useLeagueData.ts', 720],
  ])

  const sourceFiles = [...walk('app'), ...walk('components'), ...walk('lib'), ...walk('hooks')]
    .filter((relativePath) => /\.(ts|tsx)$/.test(relativePath))

  for (const relativePath of sourceFiles) {
    const lineCount = readProjectFile(relativePath).split('\n').length
    const budget = legacyBudgets.get(relativePath) ?? defaultBudget

    assert.ok(
      lineCount <= budget,
      `${relativePath} is ${lineCount} lines, which exceeds its ${budget}-line budget`
    )
  }
})

test('import guard: every React hook usage has a matching import', () => {
  const hooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect']
  const sourceFiles = [...walk('app'), ...walk('components'), ...walk('hooks'), ...walk('lib')]
    .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('node_modules'))

  const failures = []

  for (const relativePath of sourceFiles) {
    const source = readProjectFile(relativePath)
    // Skip markdown / non-code
    if (relativePath.endsWith('.md')) continue

    for (const hook of hooks) {
      // Check if this file actually calls the hook (not just mentions it in a comment/string)
      const usagePattern = new RegExp(`\\b${hook}\\s*\\(`, 'm')
      if (!usagePattern.test(source)) continue

      // Must have an import for it
      const importPattern = new RegExp(`import\\s+.*\\b${hook}\\b.*from\\s+['"]react['"]`, 'm')
      const reactDotPattern = new RegExp(`React\\.${hook}`, 'm')
      if (!importPattern.test(source) && !reactDotPattern.test(source)) {
        failures.push(`${relativePath} uses ${hook}() but does not import it from 'react'`)
      }
    }
  }

  assert.deepStrictEqual(failures, [], 'Missing React hook imports:\n' + failures.join('\n'))
})

test('auth guard: league-roster route is NOT in middleware publicRoutes', () => {
  const source = readProjectFile('middleware.ts')
  // It should not be listed as a public route since it requires auth
  assert.doesNotMatch(
    source,
    /['"]\/api\/league-roster['"]/,
    'league-roster should not be a public route — it requires auth headers'
  )
})

test('type utilization guard: critical frontend files should stay free of loose any types', () => {
  const guardedFiles = [
    'lib/user-api.ts',
    'lib/auth.tsx',
    'components/league-buddy/types.ts',
    'components/league-buddy/OverviewHeader.tsx',
    'components/league-buddy/LeagueOverviewSection.tsx',
    'components/league-buddy/LeagueBuddySidebar.tsx',
    'app/api/user-profile/route.ts',
  ]

  for (const relativePath of guardedFiles) {
    const source = readProjectFile(relativePath)
    assert.doesNotMatch(source, /:\s*any\b/, `${relativePath} should not declare \`: any\``)
    assert.doesNotMatch(
      source,
      /Record<string,\s*any>/,
      `${relativePath} should not use Record<string, any>`
    )
    assert.doesNotMatch(source, /\bany\[\]/, `${relativePath} should not use any[]`)
  }
})
