/** TASK-1303 — signal seo.rank.capture_lag contra datos reales. Read-only. */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { getSeoRankCaptureLagSignal } = await import('@/lib/reliability/queries/seo-rank-capture-lag')
  const signal = await getSeoRankCaptureLagSignal()

  console.log('[signal]', signal.signalId, signal.severity)
  console.log('[summary]', signal.summary)
  console.log('[evidence]', JSON.stringify(signal.evidence.filter(e => e.kind === 'metric')))
  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
