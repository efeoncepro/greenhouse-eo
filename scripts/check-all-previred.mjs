import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  const r = await pool.query(`
    SELECT obligation_id, status, beneficiary_name, beneficiary_id, amount,
           superseded_by, period_id, source_ref, source_kind, obligation_kind,
           created_at::text, cancelled_reason
      FROM greenhouse_finance.payment_obligations
     WHERE obligation_kind='employer_social_security'
     ORDER BY created_at ASC`)

  console.log('=== ALL employer_social_security obligations ===')
  r.rows.forEach(o => console.log(`  id=${o.obligation_id}\n    period=${o.period_id} status=${o.status} amount=${o.amount}\n    sup_by=${o.superseded_by ?? '—'}\n    source=${o.source_kind}/${o.source_ref}\n    cancel_reason=${o.cancelled_reason ?? '—'}\n`))
  console.log('Total:', r.rows.length)
} finally { await pool.end() }
