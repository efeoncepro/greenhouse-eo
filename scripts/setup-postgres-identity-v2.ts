import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-identity-v2.sql',
    successMessage: 'Applied PostgreSQL setup for Identity & Access V2',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
