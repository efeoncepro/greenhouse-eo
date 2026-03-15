import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-access.sql',
    successMessage: 'Applied PostgreSQL shared access model for Greenhouse',
    profile: 'admin'
  })

  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-access-runtime.sql',
    successMessage: 'Applied PostgreSQL runtime-owned access grants for Greenhouse',
    profile: 'runtime'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
