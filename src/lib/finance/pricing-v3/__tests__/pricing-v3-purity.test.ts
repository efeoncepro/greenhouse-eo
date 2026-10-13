// The engine runs where there is no disk (TASK-2024, EPIC-053).
//
// `src/lib/finance/pricing-v3/**` is imported by the CLI today and by platform routes next. A route on Vercel cannot
// read the repository at run time, so the engine may depend on nothing that does: its own modules, `decimal.js`,
// `zod` and `node:crypto`. Everything that touches a file lives in the file adapter under `scripts/`, which only the
// CLI imports.
//
// This is a guard over the import graph, which is structure and not behaviour: reading the specifiers IS the check.
// It is the early, local half of two verifiers. The one that decides for a deployed function is
// `pnpm vercel:reachability-gate` (scripts/ci/vercel-function-reachability-gate.mjs), which follows the live imports
// of every App Router entry and rejects `scripts/**` and paths built from the working directory. That gate only sees
// the engine once a route imports it; this file holds the line before one does.
//
// What proves the engine actually RUNS without a disk is not here either: it is case 8 of the storage conformance
// battery, which calculates and freezes over the in-memory adapter.
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

const ENGINE = resolve('src/lib/finance/pricing-v3')
const ALLOWED_PACKAGES = ['decimal.js', 'zod', 'node:crypto']
const FILE_ADAPTER = 'pricing-v3-storage-file'

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(path)

    return entry.name.endsWith('.ts') ? [path] : []
  })

// Every form a module can be pulled in by: `import … from`, `export … from`, a bare `import '…'`, `import('…')`,
// `require('…')`.
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\1/g

const specifiers = (path: string) => [...readFileSync(path, 'utf8').matchAll(SPECIFIER)].map(match => match[2])

const files = walk(ENGINE)

describe('Pricing V3 engine: nothing outside its folder but decimal.js, zod and node:crypto', () => {
  it('the walk finds the engine, and the storage port in it', () => {
    const names = files.map(path => relative(ENGINE, path).split(sep).join('/'))

    // 30 non-test modules when this guard was written; the walk must never shrink to a trivial set.
    expect(names.length).toBeGreaterThanOrEqual(30)
    expect(names).toEqual(
      expect.arrayContaining(['calculate.ts', 'schemas.ts', 'storage/port.ts', 'storage/memory.ts', 'storage/sources.ts'])
    )
  })

  it('every import of a non-test module is relative and stays inside, or is one of the three packages', () => {
    const offending = files.flatMap(path =>
      specifiers(path)
        .filter(specifier =>
          specifier.startsWith('.')
            ? relative(ENGINE, resolve(dirname(path), specifier)).startsWith('..')
            : !ALLOWED_PACKAGES.includes(specifier)
        )
        .map(specifier => `${relative(ENGINE, path)} → ${specifier}`)
    )

    expect(offending).toEqual([])
  })

  it('the detector sees the imports it must refuse', () => {
    // A guard that matches nothing is green for the wrong reason: prove the expression reads every import form.
    const sample = [
      "import { readFileSync } from 'node:fs'",
      "export { x } from '../../../scripts/commercial/pricing-v3-storage-file'",
      "import 'server-only'",
      "const pg = await import('pg')",
      "const path = require('node:path')",
      "import type { Pool } from 'pg'"
    ].join('\n')

    expect([...sample.matchAll(SPECIFIER)].map(match => match[2])).toEqual([
      'node:fs',
      '../../../scripts/commercial/pricing-v3-storage-file',
      'server-only',
      'pg',
      'node:path',
      'pg'
    ])
  })

  it('no module under src/ imports the file adapter; only tests may reach it', () => {
    // Tracked and untracked alike, so a new file is seen before its first commit.
    const found = spawnSync('git', ['grep', '--untracked', '-l', FILE_ADAPTER, '--', 'src'], { encoding: 'utf8' })

    // 0 = matches, 1 = none; anything else means the search itself did not run.
    expect([0, 1]).toContain(found.status)

    const importers = found.stdout
      .split('\n')
      .filter(Boolean)
      .filter(path => !path.includes('/__tests__/'))

    expect(importers).toEqual([])
  })
})
