import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-person-360-serving.sql',
    successMessage: 'Applied PostgreSQL Person 360 serving view for Greenhouse',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
