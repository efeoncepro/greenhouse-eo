import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-account-360-m0.sql',
    successMessage: 'Applied Account 360 M0 — organizations, spaces, person_memberships, notion_workspaces rename',
    profile: 'migrator'
  })
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
