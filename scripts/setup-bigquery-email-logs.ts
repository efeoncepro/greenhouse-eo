/**
 * Create BigQuery email_logs table for transactional email audit logging.
 * Usage: npx tsx scripts/setup-bigquery-email-logs.ts
 */
import { createRequire } from 'node:module'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

// Bypass server-only restriction for CLI scripts
const require = createRequire(import.meta.url)

const moduleWithCache = require('module') as {
  _cache: Record<string, { id: string; exports: Record<string, never>; loaded?: boolean }>
}

moduleWithCache._cache[require.resolve('server-only')] = { id: 'server-only', exports: {} }

loadGreenhouseToolEnv()

async function main() {
  const { getBigQueryClient } = await import('../src/lib/bigquery')
  const bq = getBigQueryClient()

  const query = `CREATE TABLE IF NOT EXISTS \`efeonce-group.greenhouse.email_logs\` (
    log_id STRING NOT NULL,
    resend_id STRING,
    email_to STRING NOT NULL,
    email_type STRING NOT NULL,
    user_id STRING,
    client_id STRING,
    status STRING NOT NULL,
    error_message STRING,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
  )`

  await bq.query({ query })
  console.log('[setup] ✓ email_logs table ready in BigQuery')
}

main().catch(err => {
  console.error('[setup] Failed:', err)
  process.exit(1)
})
