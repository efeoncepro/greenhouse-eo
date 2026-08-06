/** TASK-1303 — estado del consumer reactivo del mirror. Read-only. */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const log = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT r.*
       FROM greenhouse_sync.outbox_reactive_log r
       JOIN greenhouse_sync.outbox_events e ON e.event_id = r.event_id
      WHERE e.event_type = 'growth.seo.rank_snapshot.captured'
      LIMIT 5`
  )

  console.log('[reactive_log]', JSON.stringify(log, null, 1))
  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
