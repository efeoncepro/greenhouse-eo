/**
 * One-time script: update julio.reyes@efeonce.org → jreyes@efeoncepro.com in client_users
 * Run via: GREENHOUSE_POSTGRES_HOST=... npx tsx scripts/fix-user-email.ts
 */
import 'dotenv/config'

async function main() {
  // Dynamic import to let dotenv set env vars first
  const { runGreenhousePostgresQuery } = await import('../src/lib/postgres/client')

  // Update email
  const result = await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.client_users
     SET email = $1, updated_at = now()
     WHERE LOWER(email) = $2
     RETURNING user_id, email, full_name`,
    ['jreyes@efeoncepro.com', 'julio.reyes@efeonce.org']
  )

  console.log('Updated:', result)

  // Clean rate limit tokens from testing
  await runGreenhousePostgresQuery(
    `DELETE FROM greenhouse_core.auth_tokens WHERE email LIKE '%reyes%'`,
    []
  )

  console.log('Cleaned test tokens')
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
