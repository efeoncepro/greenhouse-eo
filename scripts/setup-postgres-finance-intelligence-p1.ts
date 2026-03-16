import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-finance-intelligence-p1.sql',
    successMessage: 'Applied Financial Intelligence Layer Phase 1 (cost classification, partner tracking, cost allocations, client economics)',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
