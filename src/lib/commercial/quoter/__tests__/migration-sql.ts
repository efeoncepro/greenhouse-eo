// The SQL of the quoter migrations, wherever it lives today (TASK-2025). A helper, not a test file.
//
// Until the operator approves applying them, the migrations wait in `docs/tasks/pending-migrations/`; once applied
// they live in `migrations/` under a timestamp. The same lookup is in `scripts/commercial/quoter-local-pg.mjs`, which
// is what actually applies them to the local cluster: the tests that read this text are read-only cross-checks of it.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const QUOTER_MIGRATION_SLUGS = ['quoter-source-documents-and-pointer', 'quoter-quote-aggregate', 'quoter-capabilities'] as const

export type QuoterMigrationSlug = (typeof QUOTER_MIGRATION_SLUGS)[number]

const pathOf = (slug: QuoterMigrationSlug): string | null => {
  const applied = readdirSync('migrations').find(name => name.endsWith(`_task-2025-${slug}.sql`))

  if (applied) return join('migrations', applied)

  const pending = join('docs/tasks/pending-migrations', `TASK-2025-${slug}.sql.pending`)

  return existsSync(pending) ? pending : null
}

/** The `-- Up Migration` section of a quoter migration, or `null` while that migration does not exist yet. */
export const readQuoterMigrationUp = (slug: QuoterMigrationSlug): string | null => {
  const path = pathOf(slug)

  if (!path) return null

  const sql = readFileSync(path, 'utf8')
  const up = sql.indexOf('-- Up Migration')
  const down = sql.indexOf('-- Down Migration')

  if (up < 0 || down < up) throw new Error(`${path} does not have its Up and Down markers in order`)

  return sql.slice(up, down)
}

/** The `-- Down Migration` section of a quoter migration, or `null` while that migration does not exist yet. */
export const readQuoterMigrationDown = (slug: QuoterMigrationSlug): string | null => {
  const path = pathOf(slug)

  if (!path) return null

  const sql = readFileSync(path, 'utf8')
  const down = sql.indexOf('-- Down Migration')

  if (down < 0) throw new Error(`${path} has no Down marker`)

  return sql.slice(down)
}

/** The Up sections of every quoter migration that exists, in order. */
export const readQuoterMigrations = () =>
  QUOTER_MIGRATION_SLUGS.map(slug => readQuoterMigrationUp(slug)).filter((sql): sql is string => sql !== null)
