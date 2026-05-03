import pg from 'pg'

const pool = new pg.Pool({ host: '127.0.0.1', port: 15432, database: 'greenhouse_app', user: 'greenhouse_ops', password: process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD, ssl: false })

try {
  const r = await pool.query(`
    SELECT delivery_id, delivery_kind, status, email_recipient, email_provider_id,
           sent_at::text, payment_order_id, payment_order_line_id,
           source_event_id
    FROM greenhouse_payroll.payslip_deliveries
    WHERE entry_id LIKE '%luis%' OR member_id = 'luis-reyes'
    ORDER BY created_at DESC
    LIMIT 5`)

  console.log('=== Luis payslip_deliveries (V2) ===')
  r.rows.forEach(d => console.log(`  ${d.delivery_id}\n    kind=${d.delivery_kind} status=${d.status} sent=${d.sent_at}\n    to=${d.email_recipient} resend_id=${d.email_provider_id}\n    order=${d.payment_order_id ?? '—'} line=${d.payment_order_line_id ?? '—'}\n    source_event=${d.source_event_id ?? '—'}\n`))
} finally { await pool.end() }
