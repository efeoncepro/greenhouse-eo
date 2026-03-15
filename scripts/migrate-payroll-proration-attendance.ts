import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/migrate-payroll-proration-attendance.sql',
    successMessage: 'Applied payroll proration + attendance migration (admin)',
    profile: 'admin'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
