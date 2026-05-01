import { Connector } from '@google-cloud/cloud-sql-connector'
import pg from 'pg'

const connector = new Connector()
const opts = await connector.getOptions({ instanceConnectionName: process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME, ipType: 'PUBLIC', authType: 'IAM' })
const pool = new pg.Pool({ ...opts, user: process.env.GREENHOUSE_POSTGRES_OPS_USER || 'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, database: process.env.GREENHOUSE_POSTGRES_DATABASE, max: 1 })

try {
  const obs = await pool.query(`SELECT obligation_id, period_id, source_kind, beneficiary_type, beneficiary_id, beneficiary_name, obligation_kind, amount, currency, status, due_date, space_id FROM greenhouse_finance.payment_obligations ORDER BY created_at DESC`)

  console.log('All obligations:')
  obs.rows.forEach(r => console.log('  ' + r.obligation_id?.slice(0,20) + '… kind=' + r.obligation_kind + ' status=' + r.status + ' amount=' + r.amount + ' ' + r.currency + ' beneficiary=' + r.beneficiary_id + ' period=' + r.period_id + ' space=' + (r.space_id || 'NULL')))
} finally { await pool.end(); await connector.close() }
