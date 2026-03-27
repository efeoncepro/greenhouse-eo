import process from 'node:process'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
_require('module').Module._cache[_require.resolve('server-only')] = { id: 'server-only', exports: {} }

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

const main = async () => {
  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  const cols = await runGreenhousePostgresQuery<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'greenhouse_payroll' AND table_name = 'compensation_versions'
     ORDER BY ordinal_position`
  )

  console.log('Columns in greenhouse_payroll.compensation_versions:')

  for (const c of cols) console.log(`  ${c.column_name}`)

  await closeGreenhousePostgres()
}

main()
