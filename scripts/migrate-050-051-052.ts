import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/migration-050-051-052-postgres-alignment.sql',
    successMessage: 'Applied TASK-050/051/052 Postgres alignment migration',
    profile: 'admin'
  })
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
