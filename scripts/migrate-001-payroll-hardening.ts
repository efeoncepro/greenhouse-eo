import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {}, loaded: true }

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/migration-001-payroll-hardening.sql',
    successMessage: 'Applied TASK-001 payroll hardening migration',
    profile: 'migrator'
  })
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
