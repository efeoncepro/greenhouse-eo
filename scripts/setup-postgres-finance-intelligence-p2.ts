import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-finance-intelligence-p2.sql',
    successMessage: 'Applied Financial Intelligence Layer Phase 2 (client labor cost allocation view)',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
