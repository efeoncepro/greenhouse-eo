import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

async function main() {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-person-360.sql',
    successMessage: 'Applied Person 360 serving view to greenhouse_serving schema',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error('Unable to provision Person 360 serving view.', error)
    process.exitCode = 1
  })
