import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-client-assignments.sql',
    successMessage: 'Applied PostgreSQL setup for client_team_assignments',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
