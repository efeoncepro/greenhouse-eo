/** TASK-1303 — verificación post-smoke: snapshots reales + ledger de gasto. Read-only. */
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

  const snaps = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT keyword, position, url, serp_features, provider_cost, source_run_id
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = 'seot-berel-fase0' AND capture_date = CURRENT_DATE
      ORDER BY keyword`
  )

  console.log('[snapshots]', JSON.stringify(snaps, null, 1))

  const spend = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT family, spend_date::text, call_count, provider_cost_usd
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = 'org-32333527-02a8-487b-819e-6f76a761777d'
      ORDER BY spend_date DESC LIMIT 3`
  )

  console.log('[spend_ledger]', JSON.stringify(spend))

  const outbox = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT event_type, status, occurred_at
       FROM greenhouse_sync.outbox_events
      WHERE event_type = 'growth.seo.rank_snapshot.captured'
      ORDER BY occurred_at DESC LIMIT 3`
  )

  console.log('[outbox]', JSON.stringify(outbox))
  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
