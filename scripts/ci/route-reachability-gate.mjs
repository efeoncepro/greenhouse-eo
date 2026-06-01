#!/usr/bin/env node
/**
 * TASK-982 — Route Reachability Gate.
 *
 * Detects ORPHAN routes: real `src/app/(dashboard)/**​/page.tsx` pages that
 * NOTHING in the app navigates to. A route is "reachable" if it is:
 *   (a) the target of an internal navigation literal anywhere in `src/`
 *       (`href`, `router.push/replace`, `redirect/permanentRedirect`, `<Link href>`), or
 *   (b) a declared child route in `src/lib/navigation/route-reachability-manifest.ts`
 *       (intentional sub-action reached from a parent surface), or
 *   (c) a dynamic detail route (contains a `[segment]`, reached by row click —
 *       its link is a template literal, not a static string).
 * Mockup routes (`**​/mockup/**`) are excluded.
 *
 * This is the navigation mirror of TASK-827's view-registry governance: there a
 * signal detects `viewCode ↔ DB` drift; here the gate detects `route ↔ nav` drift.
 *
 * Usage:
 *   node scripts/ci/route-reachability-gate.mjs           # warn mode (exit 0, lists orphans)
 *   node scripts/ci/route-reachability-gate.mjs --strict  # fail build on orphans (exit 1)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

const DASHBOARD_DIR = join(REPO_ROOT, 'src', 'app', '(dashboard)')
const SCAN_DIR = join(REPO_ROOT, 'src')
const MANIFEST = join(REPO_ROOT, 'src', 'lib', 'navigation', 'route-reachability-manifest.ts')

const STRICT = process.argv.includes('--strict')

/** Recursively collect files matching a predicate, skipping mockup dirs + node_modules. */
const walk = (dir, pred, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    const st = statSync(full)

    if (st.isDirectory()) {
      if (entry === 'mockup') continue
      walk(full, pred, out)
    } else if (pred(entry, full)) {
      out.push(full)
    }
  }

  
return out
}

/** Convert a (dashboard) page file path → its URL route. */
const fileToRoute = pageFile => {
  const rel = relative(DASHBOARD_DIR, pageFile)

  const segments = rel
    .split(sep)
    .slice(0, -1) // drop page.tsx
    .filter(seg => !(seg.startsWith('(') && seg.endsWith(')'))) // drop route-group segments

  
return '/' + segments.join('/')
}

const isDynamic = route => route.includes('[')

// ── Build the set of internally-linked routes (the reachability surface) ──────
// Match route literals in the common Next.js navigation forms — including
// TEMPLATE literals (backtick), since a very common pattern is
// `href={`/admin/x?memberId=${id}`}`. Template targets are matched by their
// STATIC prefix (everything before the first `${` and before `?`/`#`), which is
// deterministic (real nav intent), NOT a fuzzy `path:`/`to:` heuristic.
const NAV_PATTERNS = [
  /href:\s*'(\/[^'`]*)'/g, // object literal (VerticalMenu + menu data)
  /href:\s*"(\/[^"`]*)"/g,
  /href=\{?\s*'(\/[^'`]*)'\s*\}?/g, // JSX attr / expression, single quote
  /href=\{?\s*"(\/[^"`]*)"\s*\}?/g, // JSX attr / expression, double quote
  /\.(?:push|replace)\(\s*'(\/[^'`]*)'/g, // router.push/replace
  /\.(?:push|replace)\(\s*"(\/[^"`]*)"/g,
  /\b(?:redirect|permanentRedirect)\(\s*'(\/[^'`]*)'/g,
  /\b(?:redirect|permanentRedirect)\(\s*"(\/[^"`]*)"/g
]

// Template-literal nav targets: capture the static head up to the first `${`.
const TEMPLATE_NAV_PATTERNS = [
  /href:\s*`(\/[^`$]*)/g,
  /href=\{?\s*`(\/[^`$]*)/g,
  /\.(?:push|replace)\(\s*`(\/[^`$]*)/g,
  /\b(?:redirect|permanentRedirect)\(\s*`(\/[^`$]*)/g
]

const normalize = raw => raw.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'

const linkedExact = new Set()

const scanFiles = walk(SCAN_DIR, entry => entry.endsWith('.ts') || entry.endsWith('.tsx'))

for (const file of scanFiles) {
  if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue
  const text = readFileSync(file, 'utf8')

  for (const re of TEMPLATE_NAV_PATTERNS) {
    re.lastIndex = 0
    let m

    while ((m = re.exec(text)) !== null) linkedExact.add(normalize(m[1]))
  }

  for (const re of NAV_PATTERNS) {
    re.lastIndex = 0
    let m

    while ((m = re.exec(text)) !== null) linkedExact.add(normalize(m[1]))
  }
}

const declaredChildren = new Set()

{
  const text = readFileSync(MANIFEST, 'utf8')
  const re = /route:\s*'([^']+)'/g
  let m

  while ((m = re.exec(text)) !== null) declaredChildren.add(m[1])
}

const pages = walk(DASHBOARD_DIR, entry => entry === 'page.tsx')
const orphans = []

for (const pageFile of pages) {
  const route = fileToRoute(pageFile)

  if (route === '' || route === '/') continue
  if (linkedExact.has(route)) continue // (a)
  if (declaredChildren.has(route)) continue // (b)

  if (isDynamic(route)) {
    // (c)/(d): dynamic detail — reachable by row click / template link.
    continue
  }

  orphans.push({ route, file: relative(REPO_ROOT, pageFile) })
}

const total = pages.length

if (orphans.length === 0) {
  console.log(`✓ route-reachability-gate: ${total} (dashboard) routes, 0 orphans.`)
  process.exit(0)
}

console.error(
  `\n${STRICT ? '✗' : '⚠'} route-reachability-gate: ${orphans.length} ORPHAN route(s) of ${total} — nothing in src/ navigates to them:\n`
)
for (const o of orphans) console.error(`  • ${o.route}   (${o.file})`)
console.error(
  '\nFix one of:\n' +
    '  1. add a nav link (VerticalMenu item, header CTA, or inline <Link>),\n' +
    '  2. declare it as a child route in src/lib/navigation/route-reachability-manifest.ts (parent + via),\n' +
    '  3. confirm it is a dynamic [id] detail route.\n'
)

process.exit(STRICT ? 1 : 0)
