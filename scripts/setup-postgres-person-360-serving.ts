import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-person-360-v2.sql',
    successMessage: 'Applied PostgreSQL Person 360 enriched serving view for Greenhouse',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
