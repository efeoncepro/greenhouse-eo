import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-identity-reconciliation.sql',
    successMessage: 'Applied identity reconciliation proposals table to greenhouse_sync',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
