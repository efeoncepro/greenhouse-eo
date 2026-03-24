import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-webhooks.sql',
    successMessage: 'Applied PostgreSQL webhook foundation for Greenhouse',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
