import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-shared-assets.sql',
    successMessage: 'Shared attachments platform setup completed.',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
