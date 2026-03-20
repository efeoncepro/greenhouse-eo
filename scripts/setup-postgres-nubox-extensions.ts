import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-nubox-extensions.sql',
    successMessage: 'Applied PostgreSQL Nubox extensions (DTE columns on income/expenses + emission_log table)',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
