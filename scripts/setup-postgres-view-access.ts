import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-view-access.sql',
    successMessage: 'Applied PostgreSQL view access governance model for Greenhouse',
    profile: 'admin'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
