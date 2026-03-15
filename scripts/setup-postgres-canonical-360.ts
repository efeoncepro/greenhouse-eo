import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

async function main() {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-canonical-360.sql',
    successMessage: 'Applied PostgreSQL canonical 360 for Greenhouse',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error('Unable to provision Greenhouse PostgreSQL canonical 360 schema.', error)
    process.exitCode = 1
  })
