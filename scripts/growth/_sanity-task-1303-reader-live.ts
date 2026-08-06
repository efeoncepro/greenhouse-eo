/** TASK-1303 — readRankEvolution contra los datos reales del smoke. Read-only. */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
process.env.GROWTH_SEO_ENABLED = 'true'

const main = async () => {
  const { readRankEvolution } = await import('@/lib/growth/seo/rank-evolution-reader')

  const result = await readRankEvolution('seot-berel-fase0', { rangeDays: 30 })

  if (!result.ok) throw new Error(`reader degradó: ${result.errorCode}`)

  console.log('[reader] source=%s range=%s series=%d', result.source, JSON.stringify(result.range), result.series.length)

  for (const serie of result.series) {
    console.log('  %s → %s', serie.keyword, JSON.stringify(serie.points))
  }

  const filtered = await readRankEvolution('seot-berel-fase0', {
    rangeDays: 30,
    keywords: ['pintura para alberca']
  })

  console.log('[reader filtrado] ok=%s series=%d', filtered.ok, filtered.ok ? filtered.series.length : -1)
  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
