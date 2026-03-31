import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-staff-augmentation.sql',
    successMessage: 'Applied PostgreSQL setup for Staff Augmentation',
    profile: 'migrator'
  })
}

main().catch(error => {
  console.error('Failed to setup PostgreSQL Staff Augmentation schema.', error)
  process.exit(1)
})
