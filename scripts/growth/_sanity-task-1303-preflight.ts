/**
 * TASK-1303 — preflight del smoke real: saldo DataForSEO (user_data, gratis) + keywords
 * vigentes por target. Read-only.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { checkDataForSeoConnection } = await import('@/lib/ai/dataforseo')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const connection = await checkDataForSeoConnection({ timeoutMs: 20_000 })

  console.log('[balance] ok=%s status=%s', connection.ok, connection.httpStatus)

  const task = (connection.tasks?.[0] ?? null) as Record<string, unknown> | null
  const result = Array.isArray(task?.result) ? (task?.result as Array<Record<string, unknown>>)[0] : null
  const money = result?.money as Record<string, unknown> | undefined

  console.log('[balance] money=%s', JSON.stringify(money ?? result ?? task ?? 'sin datos'))

  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT t.seo_target_id,
            t.root_domain,
            COUNT(m.keyword) FILTER (WHERE m.effective_to IS NULL)::int AS keywords_vigentes
       FROM greenhouse_growth.seo_targets t
       LEFT JOIN greenhouse_growth.seo_keyword_sets s ON s.seo_target_id = t.seo_target_id
       LEFT JOIN greenhouse_growth.seo_keyword_set_members m ON m.keyword_set_id = s.keyword_set_id
      WHERE t.status = 'active'
      GROUP BY t.seo_target_id, t.root_domain
      ORDER BY t.seo_target_id`
  )

  console.log('[keywords]', JSON.stringify(rows))
  process.exit(0)
}

main().catch(error => {
  console.error('PREFLIGHT FAILED:', error)
  process.exit(1)
})
