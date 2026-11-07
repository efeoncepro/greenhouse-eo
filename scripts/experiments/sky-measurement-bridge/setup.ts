import { vi } from 'vitest'

if (!/^\/tmp\/sky-2094-[\w-]+\/socket$/.test(process.env.SKY_BRIDGE_LOCAL_SOCKET ?? '') ||
  process.env.GREENHOUSE_POSTGRES_HOST !== process.env.SKY_BRIDGE_LOCAL_SOCKET ||
  process.env.GREENHOUSE_POSTGRES_DATABASE !== 'sky_bridge_test' ||
  process.env.GREENHOUSE_POSTGRES_USER !== 'sky_test_app' ||
  process.env.GREENHOUSE_POSTGRES_PORT !== '55494' || process.env.GREENHOUSE_POSTGRES_SSL !== 'false') {
  throw new Error('Run only through run-local.mjs; a private owned PostgreSQL cluster is required')
}

// No cloud fallbacks. Keep real PG client/pool and real domain logic.
vi.mock('@/lib/bigquery', () => ({
  getBigQueryProjectId: () => 'synthetic-no-cloud',
  getBigQueryClient: () => { throw new Error('BigQuery prohibited in local bridge suite') }
}))
