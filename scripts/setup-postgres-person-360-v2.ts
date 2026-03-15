import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

async function main() {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-person-360-v2.sql',
    successMessage: 'Applied Person 360 v2: unified EO-ID + enriched serving view',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error('Unable to provision Person 360 v2.', error)
    process.exitCode = 1
  })
