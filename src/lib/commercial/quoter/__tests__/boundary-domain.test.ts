// Who writes the tables of the quoter, and what the quoter may reach (TASK-2025).
//
// A guard over where SQL statements and imports sit, which is structure and not behaviour: reading the source IS
// the check, the same way `pricing-v3-purity.test.ts` reads import specifiers. What it protects cannot be held by
// the database: the floor verdict of a version (`below_floor`) is whatever the writer says, because PostgreSQL cannot
// run the engine. So there is ONE writer per table, and that writer takes the verdict from the engine
// (`replayFrozenArtifact`). A second INSERT somewhere else would be a way to store a quote the engine never judged.
//
// What a role may do to these tables at all is verified where it can be exercised, against real PostgreSQL:
// `pnpm quoter:test:local` (privileges of the runtime, of the reader and of the migrations role; append-only).
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

const QUOTER = 'src/lib/commercial/quoter'

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) return ['node_modules', '__tests__', 'fixtures'].includes(entry.name) ? [] : walk(path)

    return /\.(ts|tsx|mts|mjs)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

const sources = [...walk('src'), ...walk('scripts')].map(path => ({ path: relative('.', path), text: readFileSync(path, 'utf8') }))

// Every statement that writes a table of the quoter, wherever it is. `ON CONFLICT … DO UPDATE` is part of its INSERT.
const WRITE = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:ONLY\s+)?greenhouse_commercial\.(quoter_[a-z_]+)/gi

const writers = new Map<string, Set<string>>()

for (const { path, text } of sources)
  for (const match of text.matchAll(WRITE)) {
    const key = `${match[1].replace(/\s+/g, ' ').toUpperCase()} ${match[2]}`

    writers.set(key, new Set([...(writers.get(key) ?? []), path]))
  }

describe('quoter boundary: one writer per table', () => {
  it('every table of the quoter is written by exactly one file, and only by INSERT', () => {
    const found = Object.fromEntries([...writers].sort().map(([statement, paths]) => [statement, [...paths].sort()]))

    expect(found).toEqual({
      // Catalog by digest, and the pointer: each its own store.
      'INSERT INTO quoter_pointer_history': [`${QUOTER}/pointer-store.ts`],
      'INSERT INTO quoter_source_documents': [`${QUOTER}/source-documents-store.ts`],
      // The aggregate of a quote: the one write door.
      'INSERT INTO quoter_exception_approvals': [`${QUOTER}/quote-store.ts`],
      'INSERT INTO quoter_quote_recipients': [`${QUOTER}/quote-store.ts`],
      // Rebuildable read index: the only rows of the quoter that are ever rewritten, by an upsert of this INSERT.
      'INSERT INTO quoter_quote_version_index': [`${QUOTER}/quote-store.ts`],
      'INSERT INTO quoter_quote_versions': [`${QUOTER}/quote-store.ts`],
      'INSERT INTO quoter_quotes': [`${QUOTER}/quote-store.ts`],
      'INSERT INTO quoter_state_transitions': [`${QUOTER}/quote-store.ts`],
      'INSERT INTO quoter_version_documents': [`${QUOTER}/quote-store.ts`]
    })
  })

  it('nobody writes a public number, the counter or the state matrix from code: the database does', () => {
    for (const table of ['quoter_quote_numbers', 'quoter_quote_number_counters', 'quoter_state_matrix'])
      expect([...writers.keys()].filter(statement => statement.endsWith(` ${table}`)), table).toEqual([])
  })

  it('the one writer of a version takes its verdict from the engine', () => {
    const store = sources.find(source => source.path === `${QUOTER}/quote-store.ts`)!.text

    // The guard above keeps the INSERT in this file; this keeps the file asking the engine. That the stored verdict
    // IS the engine's is exercised against PostgreSQL in `quote-aggregate.local-postgres.test.ts`.
    expect(store).toContain('replayFrozenArtifact(')
    expect(store).toContain('verdict.belowFloor')
  })
})

describe('quoter boundary: what it reaches, and who reaches it', () => {
  const quoter = sources.filter(source => source.path.startsWith(`${QUOTER}/`))

  it('the quoter folder holds source files', () => {
    expect(quoter.length).toBeGreaterThan(5)
  })

  it('it never names a table of the current quoter', () => {
    expect(quoter.filter(source => /greenhouse_commercial\.quotations?\b|greenhouse_commercial\.quotation_/.test(source.text)).map(source => source.path)).toEqual([])
  })

  it('it holds no organization identifier: the owner is resolved by its public id', () => {
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

    expect(quoter.filter(source => uuid.test(source.text)).map(source => source.path)).toEqual([])
  })

  it('the engine does not import the registry', () => {
    const engine = sources.filter(source => source.path.startsWith('src/lib/finance/pricing-v3/'))

    expect(engine.filter(source => /from ['"]@\/lib\/commercial|from ['"][./]+\/commercial\//.test(source.text)).map(source => source.path)).toEqual([])
  })

  // An acceptance criterion of TASK-2025, not a rule of the design: TASK-2026 and TASK-2027 DELETE this case with their
  // first route. If it is red because a route of theirs imports the registry, the route is right and this case goes.
  it('no route imports the registry yet: its APIs are born with their own tasks', () => {
    const routes = sources.filter(source => source.path.startsWith('src/app/'))

    expect(routes.filter(source => source.text.includes('@/lib/commercial/quoter')).map(source => source.path)).toEqual([])
  })
})
