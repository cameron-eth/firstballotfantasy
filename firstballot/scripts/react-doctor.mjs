#!/usr/bin/env node
/**
 * React doctor — static health check for the React/Next patterns this codebase has
 * been bitten by before. Encodes the hard rules from skills/frontend-developer.md so
 * they are enforced in CI rather than caught in review.
 *
 * Deliberately dependency-free: it reads source text rather than parsing, so it stays
 * fast and installs nothing. That trade means rules are written to be conservative —
 * a rule that cannot be checked without false positives is not checked at all.
 *
 * Usage: node scripts/react-doctor.mjs [--json]
 * Exits 1 when any rule reports a violation.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib']
const IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', 'build'])

const HOOKS = [
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useReducer',
  'useContext',
  'useLayoutEffect',
  'useTransition',
  'useDeferredValue',
]

function walk(dir) {
  const absolute = path.join(projectRoot, dir)
  if (!fs.existsSync(absolute)) return []

  const files = []
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const relative = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(relative))
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(relative)
  }
  return files
}

/** Strip comments and string/template literals so rules never match commented-out code. */
function stripNoise(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/`(?:[^`\\]|\\[\s\S])*`/g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (match) => match.replace(/[^\n]/g, ' '))
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length
}

const rules = []
const defineRule = (id, description, check) => rules.push({ id, description, check })

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

defineRule(
  'hooks-after-return',
  'Hooks must not be called after a conditional or early return',
  (file, source) => {
    const violations = []
    const componentPattern =
      /(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*)\s*\([\s\S]*?\)\s*(?::[^{\n]+)?\{/g

    let match
    while ((match = componentPattern.exec(source)) !== null) {
      const body = extractBlock(source, componentPattern.lastIndex - 1)
      if (!body) continue

      // Only top-level statements of the component body can be early returns.
      const earlyReturn = findTopLevel(body, /\breturn\b/g)
      if (earlyReturn === -1) continue

      const after = body.slice(earlyReturn)
      const hookAfter = findTopLevel(after, new RegExp(`\\b(?:${HOOKS.join('|')})\\s*\\(`, 'g'))
      if (hookAfter !== -1) {
        violations.push({
          file,
          line: lineOf(source, componentPattern.lastIndex + earlyReturn + hookAfter),
          message: `${match[1]}() calls a hook after an early return`,
        })
      }
    }
    return violations
  }
)

defineRule('nested-components', 'Components must not be defined inside other components', (file, source) => {
  const violations = []
  const outerPattern = /(?:export\s+(?:default\s+)?)?function\s+([A-Z][A-Za-z0-9_]*)\s*\([\s\S]*?\)\s*(?::[^{\n]+)?\{/g

  let match
  while ((match = outerPattern.exec(source)) !== null) {
    const body = extractBlock(source, outerPattern.lastIndex - 1)
    if (!body) continue

    const innerPattern = /\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/g
    let inner
    while ((inner = innerPattern.exec(body)) !== null) {
      violations.push({
        file,
        line: lineOf(source, outerPattern.lastIndex + inner.index),
        message: `${inner[1]} is defined inside ${match[1]} — hoist it to module scope`,
      })
    }
  }
  return violations
})

defineRule('index-as-key', 'Array index must not be used as a React key', (file, source) => {
  const violations = []
  // .map((item, i) => ... key={i} ...) — the index identifier reused verbatim as the key.
  const mapPattern = /\.map\(\s*\(\s*[A-Za-z0-9_$]+\s*,\s*([A-Za-z0-9_$]+)\s*\)\s*=>/g

  let match
  while ((match = mapPattern.exec(source)) !== null) {
    const indexName = match[1]
    const body = source.slice(match.index, match.index + 1200)
    const keyPattern = new RegExp(`key=\\{\\s*${indexName}\\s*\\}`)
    if (keyPattern.test(body)) {
      violations.push({
        file,
        line: lineOf(source, match.index),
        message: `key={${indexName}} uses the array index — use a stable id from the data`,
      })
    }
  }
  return violations
})

defineRule('fetch-in-effect', 'Data fetching belongs in useSWR, not useEffect', (file, source) => {
  const violations = []
  const effectPattern = /useEffect\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g

  let match
  while ((match = effectPattern.exec(source)) !== null) {
    const body = extractBlock(source, effectPattern.lastIndex - 1)
    if (!body) continue
    if (/\bfetch\s*\(/.test(body)) {
      violations.push({
        file,
        line: lineOf(source, match.index),
        message: 'useEffect calls fetch() — use useSWR so the request is cached and deduped',
      })
    }
  }
  return violations
})

defineRule('random-in-render', 'Render output must not depend on Math.random()', (file, source) => {
  const violations = []
  // Date.now() is deliberately not checked: reading the clock for a relative timestamp or
  // a fallback value is legitimate, and the two cases are not distinguishable from text.
  const pattern = /\bMath\.random\s*\(\)/g

  let match
  while ((match = pattern.exec(source)) !== null) {
    // Inside an event handler or effect this is fine; only flag module/render scope.
    const preceding = source.slice(Math.max(0, match.index - 400), match.index)
    if (/\b(?:onClick|onChange|onSubmit|useEffect|setTimeout|setInterval|addEventListener)\b/.test(preceding)) {
      continue
    }
    violations.push({
      file,
      line: lineOf(source, match.index),
      message: 'Math.random() in render makes output change between passes',
    })
  }
  return violations
})

defineRule('client-directive', "Route entry points using hooks need 'use client'", (file, source, raw) => {
  // Only route entry points are server components by default. A plain component or hook
  // module without the directive is fine — it inherits the client graph from its importer.
  if (!/^app[\\/].*[\\/](?:page|layout|template|error)\.tsx$/.test(file)) return []
  if (/^\s*['"]use client['"]/m.test(raw.slice(0, 200))) return []

  const usesHooks = new RegExp(`\\b(?:${HOOKS.join('|')})\\s*\\(`).test(source)
  const usesBrowser = /\b(?:window|document|localStorage|sessionStorage)\./.test(source)
  if (!usesHooks && !usesBrowser) return []

  return [
    {
      file,
      line: 1,
      message: `uses ${usesHooks ? 'React hooks' : 'browser APIs'} without a 'use client' directive`,
    },
  ]
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Text of the balanced { ... } block whose opening brace is at `openIndex`. */
function extractBlock(source, openIndex) {
  if (source[openIndex] !== '{') return null
  let depth = 0
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
  }
  return null
}

/** Index of the first `pattern` match at brace depth 0 within `body`, or -1. */
function findTopLevel(body, pattern) {
  const depths = new Array(body.length)
  let depth = 0
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (char === '{' || char === '(') depth++
    depths[i] = depth
    if (char === '}' || char === ')') depth--
  }

  pattern.lastIndex = 0
  let match
  while ((match = pattern.exec(body)) !== null) {
    if (depths[match.index] === 0) return match.index
  }
  return -1
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const files = SCAN_DIRS.flatMap(walk).sort()
const findings = []

for (const file of files) {
  const raw = fs.readFileSync(path.join(projectRoot, file), 'utf8')
  const source = stripNoise(raw)
  for (const rule of rules) {
    for (const violation of rule.check(file, source, raw)) {
      findings.push({ rule: rule.id, ...violation })
    }
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ scanned: files.length, findings }, null, 2))
} else {
  const byRule = new Map()
  for (const finding of findings) {
    if (!byRule.has(finding.rule)) byRule.set(finding.rule, [])
    byRule.get(finding.rule).push(finding)
  }

  console.log(`react doctor — scanned ${files.length} component files\n`)
  for (const rule of rules) {
    const hits = byRule.get(rule.id) ?? []
    const status = hits.length === 0 ? 'ok  ' : 'FAIL'
    console.log(`${status} ${rule.id.padEnd(20)} ${rule.description}`)
    for (const hit of hits) {
      console.log(`       ${hit.file}:${hit.line} — ${hit.message}`)
    }
  }
  console.log(
    findings.length === 0
      ? '\nNo issues found.'
      : `\n${findings.length} issue${findings.length === 1 ? '' : 's'} found.`
  )
}

process.exit(findings.length > 0 ? 1 : 0)
