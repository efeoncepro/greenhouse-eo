import pg from 'pg'

const pool = new pg.Pool({ host:'127.0.0.1', port:15432, database:'greenhouse_app', user:'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl:false })

try {
  // search in any state with previred name or with that source_ref
  const r = await pool.query(`
    SELECT obligation_id, status, beneficiary_name, beneficiary_id, amount,
           superseded_by, period_id, source_ref, source_kind, obligation_kind,
           created_at::text, updated_at::text
      FROM greenhouse_finance.payment_obligations
     WHERE beneficiary_id ILIKE '%previred%'
        OR LOWER(beneficiary_name) LIKE '%previred%'
        OR (period_id='2026-04' AND obligation_kind='employer_social_security')
     ORDER BY created_at ASC`)

  console.log('Total found:', r.rows.length)
  r.rows.forEach(o => console.log(`  id=${o.obligation_id} status=${o.status} amount=${o.amount} created=${o.created_at} updated=${o.updated_at}`))

  // check outbox for Previred reconcile events
  const ev = await pool.query(`
    SELECT event_id, event_type, status, occurred_at::text, payload_json->>'obligationId' as obligation_id, payload_json->>'amount' as amount
      FROM greenhouse_sync.outbox_events
     WHERE event_type LIKE 'finance.payment_obligation%'
       AND occurred_at > NOW() - INTERVAL '12 hours'
     ORDER BY occurred_at DESC
     LIMIT 20`)

  console.log('\nRecent payment_obligation events:')
  ev.rows.forEach(e => console.log(`  ${e.event_type} oid=${e.obligation_id} amt=${e.amount} status=${e.status} at=${e.occurred_at}`))
} finally { await pool.end() }
