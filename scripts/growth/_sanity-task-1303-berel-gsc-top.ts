/** TASK-1303 — top queries GSC de Berel (candidatas a seed del keyword set). Read-only. */
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

  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT g.query,
            SUM(g.impressions)::int AS impressions,
            ROUND(SUM(g.position * g.impressions) / NULLIF(SUM(g.impressions), 0), 1) AS pos_ponderada
       FROM greenhouse_growth.seo_gsc_daily g
       JOIN greenhouse_growth.seo_targets t ON t.organization_id = g.organization_id
      WHERE t.seo_target_id = 'seot-berel-fase0'
      GROUP BY g.query
      ORDER BY SUM(g.impressions) DESC
      LIMIT 12`
  )

  console.log(JSON.stringify(rows, null, 2))
  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
