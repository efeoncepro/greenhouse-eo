import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-finance-slice2.sql',
    successMessage: 'Applied PostgreSQL setup for Finance Slice 2 (income, payments, factoring, expenses, reconciliation)',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
