import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  const r = await pool.query(`
    SELECT obligation_id, status, beneficiary_name, beneficiary_id, amount, currency,
           superseded_by, period_id, source_ref, created_at::text
      FROM greenhouse_finance.payment_obligations
     WHERE period_id = '2026-04'
       AND (beneficiary_name ILIKE '%previred%' OR obligation_kind='employer_social_security')
     ORDER BY created_at ASC`)

  console.log('=== Previred obligations 2026-04 ===')
  r.rows.forEach(o => console.log(`  ${o.obligation_id}\n    name=${o.beneficiary_name} status=${o.status}\n    amount=${o.amount} ${o.currency}\n    superseded_by=${o.superseded_by ?? '—'}\n    source_ref=${o.source_ref}\n    created=${o.created_at}\n`))
} finally { await pool.end() }
