import { Connector } from '@google-cloud/cloud-sql-connector'
import pg from 'pg'

const connector = new Connector()
const opts = await connector.getOptions({ instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME, ipType: 'PUBLIC', authType: 'IAM' })
const pool = new pg.Pool({ ...opts, user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, database: process.env.GREENHOUSE_POSTGRES_DATABASE, max: 1 })

try {
  const queue = await pool.query(`SELECT status, retry_count, error_message, updated_at FROM greenhouse_sync.projection_refresh_queue WHERE projection_name='payment_obligations_from_payroll' AND entity_id='2026-04' ORDER BY updated_at DESC LIMIT 3`)

  console.log('Queue:')
  queue.rows.forEach(r => console.log('  ', r.status, 'retries=' + r.retry_count, 'updated=' + r.updated_at?.toISOString?.(), 'error=' + (r.error_message || '-').slice(0, 150)))

  const obs = await pool.query(`SELECT obligation_id, beneficiary_id, beneficiary_name, obligation_kind, amount, currency, status, superseded_by, created_at FROM greenhouse_finance.payment_obligations WHERE period_id='2026-04' ORDER BY created_at DESC`)

  console.log('\nObligations period 2026-04 (' + obs.rowCount + ' total):')
  obs.rows.forEach(r => {
    const sup = r.superseded_by ? ' →' + r.superseded_by.slice(0, 16) : ''

    console.log('  [' + r.status.padEnd(11) + '] ' + (r.beneficiary_name || '').padEnd(38) + ' ' + r.obligation_kind.padEnd(28) + String(r.amount).padStart(12) + ' ' + r.currency + sup)
  })
} finally { await pool.end(); await connector.close() }
