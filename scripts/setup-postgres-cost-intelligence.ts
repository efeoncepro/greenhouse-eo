import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-cost-intelligence.sql',
    successMessage: 'Applied PostgreSQL Cost Intelligence foundation for Greenhouse',
    profile: 'admin'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
