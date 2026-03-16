import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-organization-360.sql',
    successMessage: 'Applied organization_360 serving view',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
