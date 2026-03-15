import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-person-360-contextual.sql',
    successMessage: 'Applied PostgreSQL Person 360 contextual serving views (finance, HR, delivery)',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
