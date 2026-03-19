import process from 'node:process'

import { runPostgresSqlFile } from './lib/postgres-script-runner'

const main = async () => {
  await runPostgresSqlFile({
    sqlPath: 'scripts/setup-postgres-transactional-email.sql',
    successMessage: '[setup] ✓ auth_tokens table ready',
    profile: 'migrator'
  })
}

main().catch(err => {
  console.error('[setup] Failed:', err)
  process.exit(1)
})
