import process from 'node:process'

import { runPostgresSqlFile } from '../lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/migrations/fix-membership-type-check.sql',
    successMessage: 'Fixed CHECK constraint on person_memberships.membership_type',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
