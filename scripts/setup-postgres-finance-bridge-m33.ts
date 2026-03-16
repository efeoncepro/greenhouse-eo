import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-finance-bridge-m33.sql',
    successMessage: 'Applied Finance Bridge M3.3 — organization_id on client_profiles',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
